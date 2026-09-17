import {randomBytes,scryptSync} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
if(existsSync(resolve(root,'.env'))){console.error('.env already exists and was not overwritten. To change the password, use My account or ask another administrator to reset your access.');process.exit(1);}
const password=randomBytes(18).toString('base64url');
const salt=randomBytes(32).toString('hex');
const hash=scryptSync(password,salt,64).toString('hex');
writeFileSync(resolve(root,'.env'),'ADMIN_PASSWORD_SALT='+salt+'\nADMIN_PASSWORD_HASH='+hash+'\nPUBLIC_ORIGIN=http://localhost:3000\nDATABASE_PATH=data/tournament.sqlite\n',{mode:0o600});
const text='LOCAL ACCESS — TOURNAMENT MANAGER\n\nPanel: http://localhost:3001/admin\nUsername: admin\nPassword: '+password+'\n\nStore this password in a password manager. Do not share this file.\nEvery public installation must generate its own credentials.\n';
const dest=process.argv.indexOf('--access-file');
if(dest>=0){writeFileSync(resolve(process.argv[dest+1]),text,{mode:0o600});console.log('Configuration and private access file created.');}else console.log(text);
