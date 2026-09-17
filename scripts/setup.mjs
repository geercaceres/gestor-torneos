import {randomBytes,scryptSync} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
if(existsSync(resolve(root,'.env'))){console.error('Ya existe .env. No se sobrescribió. Para cambiar la contraseña, ingresá en Mi cuenta o pedí a otro administrador que restablezca tu acceso.');process.exit(1);}
const password=randomBytes(18).toString('base64url');
const salt=randomBytes(32).toString('hex');
const hash=scryptSync(password,salt,64).toString('hex');
writeFileSync(resolve(root,'.env'),'ADMIN_PASSWORD_SALT='+salt+'\nADMIN_PASSWORD_HASH='+hash+'\nPUBLIC_ORIGIN=http://localhost:3000\nDATABASE_PATH=data/torneo.sqlite\n',{mode:0o600});
const text='ACCESO LOCAL — GESTOR DE TORNEOS\n\nPanel: http://localhost:3001/admin\nUsuario: admin\nContraseña: '+password+'\n\nGuardá esta contraseña en un gestor seguro. No compartas este archivo.\nCada instalación pública debe generar sus propias credenciales.\n';
const dest=process.argv.indexOf('--access-file');
if(dest>=0){writeFileSync(resolve(process.argv[dest+1]),text,{mode:0o600});console.log('Configuración y archivo privado de acceso creados.');}else console.log(text);
