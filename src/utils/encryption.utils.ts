import { Logger } from '@nestjs/common';
import * as aes from 'aes-cross';
import { SecretService } from 'src/modules/aws/aws-secrets.service';

export async function encryptData(data: any) {
    const IV = '\f\r\f!!,\u0003",,\t-\u001c,\u0016\u0002';
    const secretService = new SecretService();
    // THIS LOG IS PRINT ON EVERY RESPONSE
    // Logger.log('data', data); 
    const stringData = JSON.stringify(data);
    const ENC_KEY = await secretService.getSecret('ENC_KEY');
    return await aes.enc(stringData, ENC_KEY, IV);
}

export async function decryptData(data: any) {
    const IV = '\f\r\f!!,\u0003",,\t-\u001c,\u0016\u0002';
    const secretService = new SecretService();
    Logger.log('data.string', data);

    const ENC_KEY = await secretService.getSecret('ENC_KEY');
    return await aes.dec(data, ENC_KEY, IV);
}
