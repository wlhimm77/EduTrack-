/// <reference types="gapi" />
/// <reference types="gapi.client.sheets" />
/// <reference types="gapi.client.drive" />

declare var google: any;

import firebaseConfig from '../../firebase-applet-config.json';
import { ClassGroup, Task } from '../types';

// @ts-ignore
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || firebaseConfig?.oAuthClientId || '';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

export const TARGET_FOLDER_NAME = 'FKLMST Student Assessment Data (AI Gen)';

let tokenClient: any;
let gapiInitialized = false;

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

export async function initGoogleClient(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('Google OAuth Client ID 未配置 (Missing VITE_GOOGLE_CLIENT_ID)');
  }

  return new Promise((resolve, reject) => {
    if (gapiInitialized && tokenClient) {
      resolve();
      return;
    }

    const initGapi = () => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
          });
          gapiInitialized = true;
          if (tokenClient) resolve();
        } catch (e) {
          reject(e);
        }
      });
    };

    const initGsi = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '' // Defined later
      });
      if (gapiInitialized) resolve();
    };

    if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
      initGapi();
      initGsi();
    } else {
      reject(new Error('Google APIs not loaded'));
    }
  });
}

export async function authorize(): Promise<string> {
  await initGoogleClient();
  
  return new Promise((resolve, reject) => {
    const currentToken = gapi.client.getToken();
    if (currentToken && currentToken.access_token) {
      resolve(currentToken.access_token);
      return;
    }

    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(resp);
      } else {
        gapi.client.setToken(resp);
        resolve(resp.access_token);
      }
    };
    
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Ensures the dedicated target folder "FKLMST Student Assessment Data (AI Gen)" exists in Google Drive.
 * If it doesn't exist, it creates the folder and returns its folderId.
 */
export async function getOrCreateTargetFolder(): Promise<string> {
  try {
    const query = `name = '${TARGET_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await gapi.client.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }

    // Create the folder if not found
    const fileMetadata = {
      name: TARGET_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const createResponse = await gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    });

    return createResponse.result.id;
  } catch (error) {
    console.warn('Could not query/create Drive folder directly, falling back:', error);
    // Attempt fallback or return empty string
    return '';
  }
}

/**
 * Moves a file into the specified folder in Google Drive.
 */
export async function moveFileToFolder(fileId: string, folderId: string): Promise<void> {
  if (!fileId || !folderId) return;
  try {
    // Retrieve previous parents to remove them
    const file = await gapi.client.drive.files.get({
      fileId: fileId,
      fields: 'parents'
    });

    const previousParents = file.result.parents ? file.result.parents.join(',') : '';

    await (gapi.client.drive.files.update as any)({
      fileId: fileId,
      addParents: folderId,
      removeParents: previousParents,
      fields: 'id, parents'
    });
  } catch (error) {
    console.warn('Failed to move spreadsheet to target folder:', error);
  }
}

export interface ExportClassSubjectOptions {
  classGroup: ClassGroup;
  subjectName: string;
  tasks: Task[];
  customDate?: string;
}

/**
 * Exports a comprehensive spreadsheet for a specific Class & Subject.
 * Structure:
 * - Folder: "FKLMST Student Assessment Data (AI Gen)"
 * - File Name: "Class_Assessment Name_Assessment Type_Date" (e.g., "1A_歷史科評估總表_綜合評估_2026-08-20")
 * - Contents: Every assessment mark, student average mark %, and student trend.
 */
export async function exportComprehensiveAssessmentSheet({
  classGroup,
  subjectName,
  tasks,
  customDate
}: ExportClassSubjectOptions): Promise<string> {
  await authorize();

  // 1. Get or create the dedicated folder
  const folderId = await getOrCreateTargetFolder();

  const subj = classGroup.subjects.find(s => s.name === subjectName || s.id === subjectName);
  const subjectId = subj ? subj.id : subjectName;
  const actualSubjectName = subj ? subj.name : subjectName;

  // Filter completed or tasks with grades for this class and subject
  const relevantTasks = tasks.filter(
    t => t.classId === classGroup.id && 
         (t.subjectId === subjectId || t.subjectId === actualSubjectName)
  );

  const studentCount = classGroup.size || 30;
  const studentNumbers = Array.from({ length: studentCount }, (_, i) => 
    (i + 1).toString().padStart(2, '0')
  );

  // Format Date for naming: YYYY-MM-DD
  const dateStr = customDate || new Date().toISOString().split('T')[0];

  // Excel filename strictly formatted as: "Class_Assessment Name_Assessment Type_Date"
  const fileName = `${classGroup.name}_${actualSubjectName}評估總表_綜合評估_${dateStr}`;
  const sheetTabName = `${classGroup.name}_${actualSubjectName}`.slice(0, 50);

  // Headers: [學號 (Student No.), Task 1 (Max XX), Task 2 (Max XX)..., 平均分數 (Average %), 趨勢 (Trend)]
  const headers: string[] = ['學號 (Student No.)'];
  relevantTasks.forEach(task => {
    const maxStr = task.maxScore ? ` (${task.maxScore}分)` : '';
    headers.push(`${task.title} [${task.type}]${maxStr}`);
  });
  headers.push('平均百分比 (Average %)', '學生趨勢 (Trend)');

  // Build rows for each student
  const rows: (string | number)[][] = [headers];

  studentNumbers.forEach(studentNum => {
    const row: (string | number)[] = [studentNum];
    let totalPercentage = 0;
    let countedAssessments = 0;
    const scoresHistory: number[] = [];

    relevantTasks.forEach(task => {
      const grade = task.grades?.find(g => g.studentNumber === studentNum);
      if (!grade) {
        row.push('---');
      } else if (grade.missing) {
        row.push('欠交 (Missing)');
      } else if (grade.score !== null && grade.score !== undefined) {
        const numericScore = Number(grade.score);
        row.push(numericScore);
        if (task.maxScore && task.maxScore > 0) {
          const percent = (numericScore / task.maxScore) * 100;
          totalPercentage += percent;
          countedAssessments += 1;
          scoresHistory.push(percent);
        }
      } else {
        row.push('---');
      }
    });

    // Calculate average %
    let avgFormatted = '---';
    let avgPercentNum = 0;
    if (countedAssessments > 0) {
      avgPercentNum = Math.round(totalPercentage / countedAssessments);
      avgFormatted = `${avgPercentNum}%`;
    }
    row.push(avgFormatted);

    // Calculate trend
    let trendStr = '持平 (Stable)';
    if (scoresHistory.length >= 2) {
      const firstScore = scoresHistory[0];
      const lastScore = scoresHistory[scoresHistory.length - 1];
      if (lastScore - firstScore >= 5) {
        trendStr = '進步 (Up)';
      } else if (firstScore - lastScore >= 5) {
        trendStr = '退步 (Down)';
      } else {
        trendStr = '持平 (Stable)';
      }
    } else if (countedAssessments > 0) {
      trendStr = avgPercentNum >= 80 ? '優良 (High)' : avgPercentNum < 50 ? '需關注 (Low)' : '持平 (Stable)';
    }
    row.push(trendStr);

    rows.push(row);
  });

  // 2. Create new spreadsheet with explicit naming
  const spreadsheet = await gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: {
        title: fileName
      },
      sheets: [
        {
          properties: {
            title: sheetTabName
          }
        }
      ]
    }
  });

  const spreadsheetId = spreadsheet.result.spreadsheetId;
  if (!spreadsheetId) throw new Error('無法建立 Google Sheets 檔案');

  // 3. Write data to the created spreadsheet
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTabName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: rows
    }
  });

  // 4. Move spreadsheet into the designated Drive folder
  if (folderId) {
    await moveFileToFolder(spreadsheetId, folderId);
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * Export a single Assessment Task spreadsheet into the target folder.
 * File Name strictly formatted as: "Class_Assessment Name_Assessment Type_Date"
 * (e.g. "1A_第一次測驗_小測_2026-08-20")
 */
export async function exportSingleTaskSheet(task: Task, classGroup: ClassGroup, subjectName: string): Promise<string> {
  await authorize();
  const folderId = await getOrCreateTargetFolder();

  const taskDate = task.dueDate || new Date().toISOString().split('T')[0];
  const fileName = `${classGroup.name}_${task.title}_${task.type || '評估'}_${taskDate}`;
  const sheetTabName = `${classGroup.name}_${task.title}`.slice(0, 50);

  const studentCount = classGroup.size || 30;
  const studentNumbers = Array.from({ length: studentCount }, (_, i) => 
    (i + 1).toString().padStart(2, '0')
  );

  const maxScore = task.maxScore || 100;
  const headers = ['學號 (Student No.)', `分數 (Score / ${maxScore})`, '百分比 (Percentage %)', '狀態 (Status)'];
  const rows: (string | number)[][] = [headers];

  studentNumbers.forEach(studentNum => {
    const grade = task.grades?.find(g => g.studentNumber === studentNum);
    if (!grade) {
      rows.push([studentNum, '---', '---', '未評分']);
    } else if (grade.missing) {
      rows.push([studentNum, '---', '0%', '欠交 (Missing)']);
    } else if (grade.score !== null && grade.score !== undefined) {
      const score = Number(grade.score);
      const percent = `${Math.round((score / maxScore) * 100)}%`;
      rows.push([studentNum, score, percent, '已評分']);
    } else {
      rows.push([studentNum, '---', '---', '未評分']);
    }
  });

  const spreadsheet = await gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: {
        title: fileName
      },
      sheets: [
        {
          properties: {
            title: sheetTabName
          }
        }
      ]
    }
  });

  const spreadsheetId = spreadsheet.result.spreadsheetId;
  if (!spreadsheetId) throw new Error('無法建立 Google Sheets 檔案');

  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTabName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: rows
    }
  });

  if (folderId) {
    await moveFileToFolder(spreadsheetId, folderId);
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
