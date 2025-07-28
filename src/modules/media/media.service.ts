import {
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
    UnauthorizedException,
    forwardRef
} from '@nestjs/common';
import {
    PutObjectCommand,
    S3Client,
    HeadObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    GetObjectCommandOutput,
    GetObjectCommandInput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { ReferenceService } from '../reference/reference.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import { UserService } from '../user/user.service';
import { extname } from 'path';
import { SecretService } from '../aws/aws-secrets.service';
import { JwtService } from '@nestjs/jwt';

const sharp = require('sharp');

@Injectable()
export class MediaService implements OnModuleInit {
    private s3Client;
    constructor(
        private readonly configService: ConfigService,
        private referenceService: ReferenceService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        @InjectRepository(Media)
        private mediaRepo: Repository<Media>,
        private jwtService: JwtService,
        private secretService: SecretService
    ) {}

    async onModuleInit() {
        try {
            const secrets = await this.secretService.getSecret();
            this.s3Client = new S3Client({
                region: secrets['AWS_S3_REGION'],
                credentials: {
                    accessKeyId: secrets['AWS_ACCESS_KEY_ID'],
                    secretAccessKey: secrets['AWS_SECRET_ACCESS_KEY']
                }
            });
        } catch (error) {
            console.error('Failed to initialize S3Client:', error);
        }
    }

    async findOneByRef(refId: number, refTypeId: number): Promise<Media> {
        return this.mediaRepo.findOneBy({ refId, refTypeId });
    }

    async findAndUpdate(userEmail: string, file: any): Promise<any> {
        const dbUser = await this.userService.findOneByEmail(userEmail);
        if (!dbUser) throw new NotFoundException('User not found');

        // S3 Media Logic

        await this.uploadFile(file.originalname, file.buffer);
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/${file.originalname}`;
        // You can return the URL or any other response as needed

        // Retrieve the reference for 'user'
        const ref = await this.referenceService.findOneByName('user');

        // Try to find the existing Address record
        let dbMedia: Media = await this.findOneByRef(dbUser.id, 1);

        // If the record doesn't exist, create a new Address instance

        if (dbMedia) {
            // Get File-Name from DB and Delete from S3
            const dbFileName = dbMedia.fileName;
            await this.deleteFile(dbFileName, dbMedia.id);
        }

        if (!dbMedia) {
            dbMedia = new Media();
        }

        // Update the properties of the Address instance
        dbMedia.refId = dbUser.id;
        dbMedia.refTypeId = ref.id;
        dbMedia.fileName = file.originalname;
        dbMedia.fileURL = mediaUrl;

        // Save the Address record
        await this.mediaRepo.save(dbMedia);

        return mediaUrl;
    }

    async findAndUpdateUserMedia(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }

        // S3 Media Logic
        await this.uploadFile(file.originalname, file.buffer, 'users');
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/users/${file.originalname}`;
        // You can return the URL or any other response as needed
        return mediaUrl;
    }

    async findAndUpdateOrgMedia(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }

        // S3 Media Logic
        await this.uploadFile(file.originalname, file.buffer, 'organizations');
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/organizations/${file.originalname}`;
        // You can return the URL or any other response as needed
        return mediaUrl;
    }

    async findAndUpdateCompanyMedia(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadFile(file.originalname, file.buffer, 'companies');
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/companies/${file.originalname}`;
        return mediaUrl;
    }

    async findAndUpdateSpecialityMedia(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadFile(file.originalname, file.buffer, 'specialities');
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/specialities/${file.originalname}`;
        return mediaUrl;
    }

    async findAndUpdateTherapistMedia(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadFile(file.originalname, file.buffer, 'therapists');
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/therapists/${file.originalname}`;
        return mediaUrl;
    }

    async findAndUpdateTherapistIntroMedia(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldPublicFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadPublicFile(file.originalname, file.buffer);
        // Construct the S3 file URL
        const mediaUrl = `https://logo-public-its.s3.us-east-1.amazonaws.com/${file.originalname}`;
        return mediaUrl;
    }

    async findAndUpdateClientMedia(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadFile(file.originalname, file.buffer, 'clients');
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/clients/${file.originalname}`;
        return mediaUrl;
    }

    async findAndUpdatePublicClientMedia(file: any, oldFileName: any, authorizationHeader: string): Promise<any> {
        if (!authorizationHeader) throw new UnauthorizedException(['Token missing.']);

        const [, token] = authorizationHeader.split('Bearer ');
        const payload = await this.jwtService.verify(token, {
            secret: await this.secretService?.getSecret('JWT_ACCESS_SECRET')
        });
        if (!payload) throw new UnauthorizedException('Token expired.');

        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadFile(file.originalname, file.buffer, 'clients');
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/clients/${file.originalname}`;
        return mediaUrl;
    }

    async findAndUpdateMedia(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadFile(file.originalname, file.buffer);
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/${file.originalname}`;
        return mediaUrl;
    }

    async findAndUpdateCmsFile(file: any, oldFileName: any, fileType: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldCmsFileName(oldFileName, fileType);
        }
        // S3 Media Logic
        await this.uploadCmsFile(file.originalname, file.buffer, fileType);
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/cms/${fileType}/${file.originalname}.webp`;
        return mediaUrl;
    }

    async uploadCmsFile(fileName: string, file: Buffer, fileType: string) {
        const webpBuffer = await sharp(file)
            .webp() // Adjust quality as needed
            .toBuffer();

        // Construct the Key including the subfolder
        const key = `cms/${fileType}/${fileName}.webp`;

        // Upload to S3
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: 'product-dev-s3',
                Key: key,
                Body: webpBuffer
            })
        );
    }

    async deleteOldCmsFileName(oldFileName: string, fileType: string) {
        const key = `cms/${fileType}/${oldFileName}.webp`;
        const deleteParams = {
            Bucket: 'product-dev-s3',
            Key: key
        };

        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (error) {
            // Handle the error, e.g., unable to delete file
            throw new Error('Error deleting file from S3');
        }
    }

    async findAndUpdateReviewFile(file: any, oldFileName: any, fileType: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldReviewFileName(oldFileName, fileType);
        }
        // S3 Media Logic
        await this.uploadReviewFile(file.originalname, file.buffer, fileType);
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/review/${file.originalname}.webp`;

        return mediaUrl;
    }

    async uploadReviewFile(fileName: string, file: Buffer, fileType: string) {
        try {
            const webpBuffer = await sharp(file)
                .webp() // Adjust quality as needed
                .toBuffer();

            // Construct the Key including the subfolder
            const key = `review/${fileName}.webp`;

            // Upload to S3
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: 'product-dev-s3',
                    Key: key,
                    Body: webpBuffer
                })
            );
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    }

    async deleteOldReviewFileName(oldFileName: string, fileType: string) {
        const key = `review/${oldFileName}.webp`;
        const deleteParams = {
            Bucket: 'product-dev-s3',
            Key: key
        };

        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (error) {
            // Handle the error, e.g., unable to delete file
            throw new Error('Error deleting file from S3');
        }
    }

    async findAndUpdateFileWebsite(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldWebsiteFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadFileWebsite(file.originalname, file.buffer);
        // Construct the S3 file URL
        const mediaUrl = `https://product-dev-s3.s3.amazonaws.com/file/${file.originalname}`;

        return mediaUrl;
    }

    async uploadFileWebsite(fileName: string, file: Buffer) {
        // Construct the Key including the subfolder
        const key = `file/${fileName}`;

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: 'product-dev-s3',
                Key: key,
                Body: file
            })
        );
    }

    async deleteOldWebsiteFileName(oldFileName: string) {
        const key = `file/${oldFileName}`;

        const deleteParams = {
            Bucket: 'product-dev-s3',
            Key: key
        };

        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (error) {
            // Handle the error, e.g., unable to delete file
            throw new Error('Error deleting file from S3');
        }
    }

    async uploadFile(fileName: string, file: Buffer, slug?: string) {
        const fileExtension = extname(fileName).toLowerCase(); // Get file extension

        // List of image file extensions
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

        const fullPath = slug ? `${slug}/${fileName}` : fileName;

        // // Check if file extension is in the list of image extensions
        if (imageExtensions.includes(fileExtension)) {
            // File is an image
            const webpBuffer = await sharp(file)
                .webp() // Adjust quality as needed
                .toBuffer();

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: 'product-dev-s3',
                    Key: fullPath,
                    Body: webpBuffer
                })
            );
        } else {
            // File is not an image, upload it directly
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: 'product-dev-s3',
                    Key: fullPath,
                    Body: file
                })
            );
        }
    }

    async uploadPublicFile(fileName: string, file: Buffer, slug?: string) {
        const fileExtension = extname(fileName).toLowerCase(); // Get file extension
        // List of image file extensions
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

        const fullPath = slug ? `${slug}/${fileName}` : fileName;

        // // Check if file extension is in the list of image extensions
        if (imageExtensions.includes(fileExtension)) {
            // File is an image
            const webpBuffer = await sharp(file)
                .webp() // Adjust quality as needed
                .toBuffer();

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: 'logo-public-its',
                    Key: fullPath,
                    Body: webpBuffer
                })
            );
        } else {
            // File is not an image, upload it directly
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: 'logo-public-its',
                    Key: fullPath,
                    Body: file
                })
            );
        }
    }

    async uploadTestFile(file: any, oldFileName: any): Promise<any> {
        if (oldFileName !== '') {
            await this.deleteOldFileName(oldFileName);
        }
        // S3 Media Logic
        await this.uploadFileTesting(file.originalname, file.buffer);
        // Construct the S3 file URL
        const mediaUrl = `https://testbucketits.s3.amazonaws.com/${file.originalname}`;

        return mediaUrl;
    }

    async uploadFileTesting(fileName: string, file: Buffer) {
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: 'testbucketits',
                Key: fileName,
                Body: file
            })
        );
    }

    async headObject(fileName: string) {
        const headParams = {
            Bucket: 'product-dev-s3',
            Key: fileName
        };

        try {
            await this.s3Client.send(new HeadObjectCommand(headParams));
        } catch (error) {
            // Handle the error, e.g., file not found
            throw new Error('File not found');
        }
    }

    async deleteFile(fileName: string, mediaId: number) {
        const deleteParams = {
            Bucket: 'product-dev-s3',
            Key: fileName
        };

        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteParams));
            await this.mediaRepo.delete({ id: mediaId });
        } catch (error) {
            // Handle the error, e.g., unable to delete file
            throw new Error('Error deleting file from S3');
        }
    }

    async deleteOldFileName(oldFileName: string) {
        const deleteParams = {
            Bucket: 'product-dev-s3',
            Key: oldFileName
        };

        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (error) {
            // Handle the error, e.g., unable to delete file
            throw new Error('Error deleting file from S3');
        }
    }

    async deleteOldPublicFileName(oldFileName: string) {
        const deleteParams = {
            Bucket: 'logo-public-its',
            Key: oldFileName
        };

        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (error) {
            // Handle the error, e.g., unable to delete file
            throw new Error('Error deleting file from S3');
        }
    }

    async deleteUserFile(userEmail: string, deleteFile: string): Promise<any> {
        try {
            const dbUser = await this.userService.findOneByEmail(userEmail);
            if (!dbUser) throw new NotFoundException(['User Not Found']);

            const ref = await this.referenceService.findOneByName('user');

            const dbMedia = await this.findOneByRef(dbUser.id, ref.id);
            if (!dbMedia) throw new NotFoundException(['Media Already Deleted']);

            if (dbMedia.fileName !== deleteFile) throw new NotFoundException(['Media Not Found']);

            let fileName = dbMedia.fileName;

            // Check if the file exists before deleting
            await this.headObject(fileName);

            // Delete the file from S3
            await this.deleteFile(fileName, dbMedia.id);
        } catch (error) {
            // Handle errors appropriately
            Logger.error('Error deleting file: ', error);
            throw new Error('Error deleting file');
        }
    }

    async deleteOrganizatonFile(orgId: number, deleteFile: string): Promise<any> {
        try {
            const ref = await this.referenceService.findOneByName('organization');

            const dbMedia = await this.findOneByRef(orgId, ref.id);
            if (!dbMedia) throw new NotFoundException(['Media Already Deleted']);

            if (dbMedia.fileName !== deleteFile) throw new NotFoundException(['Media Not Found']);

            let fileName = dbMedia.fileName;

            // Check if the file exists before deleting
            await this.headObject(fileName);

            // Delete the file from S3
            await this.deleteFile(fileName, dbMedia.id);
        } catch (error) {
            // Handle errors appropriately
            Logger.error('Error deleting file: ', error);
            throw new Error('Error deleting file');
        }
    }

    async deleteBulk(orgId: number, deleteFile: string): Promise<any> {
        try {
            let fileName = deleteFile;

            // Check if the file exists before deleting
            await this.headObject(fileName);

            // Delete the file from S3
            const deleteParams = {
                Bucket: 'product-dev-s3',
                Key: fileName
            };

            try {
                await this.s3Client.send(new DeleteObjectCommand(deleteParams));
            } catch (error) {
                // Handle the error, e.g., unable to delete file
                throw new Error('Error deleting file from S3');
            }
        } catch (error) {
            // Handle errors appropriately
            Logger.error('Error deleting file: ', error);
            throw new Error('Error deleting file');
        }
    }

    async deleteFiles(fileNames: string[]) {
        const deletePromises = fileNames.map(async (fileName) => {
            const deleteParams = {
                Bucket: 'product-dev-s3',
                Key: fileName
            };

            try {
                await this.s3Client.send(new DeleteObjectCommand(deleteParams));
            } catch (error) {
                // Handle the error, e.g., unable to delete file
                console.error(`Error deleting file ${fileName} from S3:`, error);
            }
        });

        try {
            await Promise.all(deletePromises);
        } catch (error) {
            // Handle any errors that occurred during bulk deletion
            console.error('Error deleting files from S3:', error);
            throw new Error('Error deleting files from S3');
        }
    }

    async deleteOneFile(fileName: string) {
        const deleteParamsForOneFile = {
            Bucket: 'product-dev-s3',
            Key: fileName
        };

        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteParamsForOneFile));
        } catch (error) {
            // Handle the error, e.g., unable to delete file
            throw new Error('Error deleting file from S3');
        }
    }

    async deleteFileTest(fileName: string) {
        const deleteParamsForFileTest = {
            Bucket: 'product-dev-s3',
            Key: fileName
        };

        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteParamsForFileTest));
        } catch (error) {
            // Handle the error, e.g., unable to delete file
            throw new Error('Error deleting file from S3');
        }
    }

    async downloadFile(fileName: string): Promise<any> {
        const command = new GetObjectCommand({
            Bucket: 'product-dev-s3',
            Key: fileName
        });

        return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    }

    async downloadFiles(fileNames: string[]): Promise<{ [fileName: string]: string }> {
        const signedUrls: { [fileName: string]: string } = {};

        for (const fileName of fileNames) {
            const command = new GetObjectCommand({
                Bucket: 'product-dev-s3',
                Key: fileName
            });

            const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
            signedUrls[fileName] = signedUrl;
        }

        return signedUrls;
    }

    async getS3Object(params: GetObjectCommandInput): Promise<GetObjectCommandOutput> {
        try {
            const command = new GetObjectCommand(params);
            const data = await this.s3Client.send(command);
            return data;
        } catch (error) {
            console.error('Error while getting object from S3:', error);
            throw error;
        }
    }

    async readStream(s3ObjectBody: any): Promise<Uint8Array> {
        const chunks: Uint8Array[] = [];
        for await (const chunk of s3ObjectBody) {
            if (chunk instanceof Uint8Array) {
                chunks.push(chunk);
            }
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);

        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result;
    }

    async readBlobStream(blob: Blob): Promise<Uint8Array> {
        const reader = blob.stream().getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;
            chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);

        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result;
    }
}
