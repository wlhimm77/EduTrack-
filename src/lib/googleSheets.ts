/// <reference types="gapi" />
/// <reference types="gapi.client.sheets" />
/// <reference types="gapi.client.drive" />

declare var google: any;

// @ts-ignore
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4', 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

let tokenClient: any;
let gapiInitialized = false;

export async function initGoogleClient(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID');
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

    // Assuming scripts are loaded via index.html
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
    // Check if we already have a valid token
    const currentToken = gapi.client.getToken();
    if (currentToken && currentToken.access_token) {
      resolve(currentToken.access_token);
      return;
    }

    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(resp);
      } else {
        resolve(resp.access_token);
      }
    };
    
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function exportTaskToMasterSheet(taskTitle: string, className: string, subjectName: string, grades: any[], maxScore: number): Promise<string> {
  await authorize();

  let spreadsheetId = localStorage.getItem('edutrack_master_sheet_id');

  if (!spreadsheetId) {
    // Create new master spreadsheet
    const spreadsheet = await gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: 'EduTrack - All Assessment Records'
        },
        sheets: [
          {
            properties: {
              title: 'All Assessments'
            }
          }
        ]
      }
    });
    
    spreadsheetId = spreadsheet.result.spreadsheetId;
    if (!spreadsheetId) throw new Error('Failed to create master spreadsheet');
    
    localStorage.setItem('edutrack_master_sheet_id', spreadsheetId);

    // Write Headers
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'All Assessments!A1:F1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['Date Exported', 'Class', 'Subject', 'Task Title', 'Student Number', 'Score (%)']]
      }
    });
  }

  // Format data to append
  const dateStr = new Date().toLocaleDateString();
  const rows = grades.filter(g => !g.missing && g.score !== null).map(g => {
    const percentage = Math.round((g.score / maxScore) * 100);
    return [dateStr, className, subjectName, taskTitle, g.studentNumber, `${percentage}%`];
  });

  if (rows.length === 0) return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Append data
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'All Assessments!A:F',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: rows
    }
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
export async function saveMarksToSheet(title: string, data: any[]): Promise<string> {
  await authorize();
  
  // Create new spreadsheet
  const spreadsheet = await gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: {
        title: title
      }
    }
  });
  
  const spreadsheetId = spreadsheet.result.spreadsheetId;
  if (!spreadsheetId) throw new Error('Failed to create spreadsheet');
  
  // Format data for Sheets
  const rows = [
    ['學號', '分數', '趨勢'], // Headers
    ...data.map(student => [student.studentNumber, student.score.toString(), student.trend])
  ];
  
  // Write data
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1:C',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: rows
    }
  });
  
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
