import { Response } from 'express';
import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { ReferenceService } from '../reference/reference.service';
import { UserService } from '../user/user.service';
import { SecretService } from '../aws/aws-secrets.service';
import { JwtService } from '@nestjs/jwt';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import * as https from 'https';
const sharp = require('sharp');
import * as mimeTypes from 'mime-types';
import * as mime from 'mime';

@Injectable()
export class AwsService {
    private readonly logger = new Logger(AwsService.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly bucketUrl: string;
    constructor(
        private jwtService: JwtService,
        private secretService: SecretService
    ) {
        this.s3Client = new S3Client({
            region: process.env.AWS_S3_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            },
            requestHandler: new NodeHttpHandler({
                httpAgent: new https.Agent({
                    maxSockets: 200,
                    keepAlive: true
                })
            })
        });

        this.bucketName = process.env.AWS_S3_BUCKET_NAME;
        this.bucketUrl = process.env.AWS_S3_BUCKET_URL;
    }
// this is aws s3 bucket code to upload file in s3 bucket for insurance

async uploadFile(
    file: Express.Multer.File,
    documentType: string
  ): Promise<{ fileUploaded: boolean; name: string }> {
    console.log("document type is heere", documentType, file);
    
    const validDocumentTypes = [
      'ticket-document',
      'insurance-user',
      'user-medical',
      'insurance-dependent',
      'dependent-medical',
      'insured-person',
      'insured-medical',
      'vehicle-document',
      'claims'
    ];

    if (!validDocumentTypes.includes(documentType)) {
      throw new NotFoundException('Invalid document type');
    }

    try {
      const timestamp = Date.now();
      const newfiles = `${timestamp}_${file.originalname}`;
      const myFile = newfiles.replace(/\s/g, '_');
      const s3Path = `${documentType}/${myFile}`;
            // console.log('myfile and s3Path', myFile, s3Path);
      const contentType = file.mimetype || mimeTypes.lookup(file.originalname) || 'application/octet-stream';
      let buffer = file.buffer;

      if (file.mimetype.startsWith('image/')) {
        buffer = await sharp(file.buffer)
          .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
          .toBuffer();
      }

      const params = {
        Bucket: this.bucketName,
        Key: s3Path,
        Body: buffer,
        ContentType: contentType,
      };

     const res = await this.s3Client.send(new PutObjectCommand(params));
            // console.log('res', res);
      const fileUrl = `${this.bucketUrl}/${s3Path}`;
      // this.logger.log(`Uploaded file: ${s3Path}`);
      return { fileUploaded: true, name: myFile };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`);
      return { fileUploaded: false, name: '' };
    }
  }

// async getFile(documentType: string, fileName: string, res: Response): Promise<void> {
//     const validDocumentTypes = [
//         'ticket-document',
//         'insurance-user',
//         'user-medical',
//         'insurance-dependent',
//         'dependent-medical',
//         'insured-person',
//         'insured-medical',
//         'vehicle-document',
//     ];

//     if (!validDocumentTypes.includes(documentType)) {
//         throw new NotFoundException('Invalid document type');
//     }

//     const s3Path = `${documentType}/${fileName}`;
//     try {
//         const command = new GetObjectCommand({
//             Bucket: this.bucketName,
//             Key: s3Path,
//         });

//         const { Body, ContentType } = await this.s3Client.send(command);
//         if (!Body) {
//             throw new NotFoundException('File not found');
//         }

//         const mimeType = ContentType || mime.lookup(fileName) || 'application/octet-stream';
//         const previewableTypes = [
//             'image/jpeg',
//             'image/png',
//             'image/gif',
//             'image/bmp',
//             'image/webp',
//             'application/pdf',
//             'text/plain',
//             // Add other previewable MIME types as needed
//         ];
//         const disposition = previewableTypes.includes(mimeType) ? 'inline' : 'attachment';

//         console.log('Content-Type from S3:', ContentType);
//         console.log('Resolved MIME type:', mimeType);
//         console.log('Content-Disposition:', disposition);

//         res.setHeader('Content-Type', mimeType);
//         res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);

//         (Body as any).pipe(res);
//     } catch (error: any) {
//         this.logger.error(`Failed to stream file ${s3Path}: ${error.message}`);
//         throw new NotFoundException(`File not found or inaccessible: ${error.message}`);
//     }
// }

async getFile(documentType: string, fileName: string, res: Response): Promise<void> {
    const validDocumentTypes = [
      'ticket-document',
      'insurance-user',
      'user-medical',
      'insurance-dependent',
      'dependent-medical',
      'insured-person',
      'insured-medical',
      'vehicle-document',
      'claims'
    ];

    if (!validDocumentTypes.includes(documentType)) {
      throw new NotFoundException('Invalid document type');
    }

    const s3Path = `${documentType}/${fileName}`;
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Path,
      });

      const { Body, ContentType } = await this.s3Client.send(command);
      if (!Body) {
        throw new NotFoundException('File not found');
      }

      const mimeType = ContentType || mimeTypes.lookup(fileName) || 'application/octet-stream';
      const previewableTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'application/pdf',
        'text/plain',
      ];
      const disposition = previewableTypes.includes(mimeType) ? 'inline' : 'attachment';

      // console.log('Content-Type from S3:', ContentType);
      // console.log('Resolved MIME type:', mimeType);
      // console.log('Content-Disposition:', disposition);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);

      (Body as any).pipe(res);
    } catch (error: any) {
      this.logger.error(`Failed to stream file ${s3Path}: ${error.message}`);
      throw new NotFoundException(`File not found or inaccessible: ${error.message}`);
    }
  }
}
