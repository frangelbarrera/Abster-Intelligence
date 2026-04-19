import * as fs from 'fs';
import * as path from 'path';

function replaceInDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.match(/\.(tsx|ts|html|json|css|md)$/)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let newContent = content.replace(/Abstergo/g, 'Abster')
                              .replace(/abstergo/g, 'abster')
                              .replace(/ABSTERGO/g, 'ABSTER');
                              
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated content in', fullPath);
      }
    }
  }
}

function renameFilesInDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      renameFilesInDir(fullPath);
    } else {
      if (file.toLowerCase().includes('abstergo')) {
        const newFile = file.replace(/Abstergo/g, 'Abster').replace(/abstergo/g, 'abster');
        const newPath = path.join(dir, newFile);
        fs.renameSync(fullPath, newPath);
        console.log('Renamed', fullPath, 'to', newPath);
      }
    }
  }
}

replaceInDir('./src');
renameFilesInDir('./src');
