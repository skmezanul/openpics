const {app, BrowserWindow, ipcMain, dialog, Menu} = require('electron')
const url = require('url')
const path = require('path')

let win
let downloadItem
function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({minHeight: 800, minWidth: 1024, webPreferences: {
    webgl: false,
    webaudio: false,
    nodeIntegration: 'iframe',
    allowDisplayingInsecureContent: true,
    allowRunningInsecureContent: true
  }})
 
  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, '/index.html'),
    protocol: 'file:',
    slashes: true
  }));
  // win.loadURL('http://localhost:8000');
 
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('get-download-path')
  })

  // Open the DevTools.
  // win.webContents.openDevTools()
 
  // Emitted when the window is closed.
  win.on('closed', () => {
    win = null
  })
  // Menu.setApplicationMenu(null);
  initDownload();
}
 
 
app.on('ready', createWindow)
 
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
 
app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})
 
ipcMain.on('set-download-path', (event, path) => {
  // win.webContents.session.setDownloadPath(path);
  app.setPath('downloads',path);
})

ipcMain.on('change-download-path',(event,args)=>{
  changeDownloadPath();
})

function changeDownloadPath(){
  const options = {
    title: 'Select default download directory',
    defaultPath: app.getPath('downloads'),
    properties: ['openDirectory']
  }
  dialog.showOpenDialog(options, function (filenames) {
    if (filenames === undefined) return;
    var filename = filenames[0];
      win.webContents.send('set-download-path',filename);
      app.setPath('downloads',filename);
  })
}

function initDownload(path){
  win.webContents.session.on('will-download', (event, item, webContents) => {
  var savePath = app.getPath('downloads') +"/"+item.getFilename();
  item.setSavePath(savePath);
  webContents.send('download-begin', item.getFilename());
  item.on('updated', (event, state) => {
    if (state === 'interrupted') {
      webContents.send('download-interrupted',item.getFilename());
      console.log('Download is interrupted but can be resumed')
    } else if (state === 'progressing') {
      if (item.isPaused()) {
        webContents.send('download-paused',state);
        console.log('Download is paused')
      } else {
        let progress = Math.ceil((item.getReceivedBytes()/item.getTotalBytes())*100);
        webContents.send('download-progress',progress)
        console.log(`Received bytes: ${progress}`)
      }
    }
  })
  item.once('done', (event, state) => {
    if (state === 'completed') {
        win.webContents.send('download-complete',savePath)
      console.log('Download successfully')
    } else {
      webContents.send('download-failed',item.getFilename());
      console.log(`Download failed: ${state}`)
    }
  })
})
}