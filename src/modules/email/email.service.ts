import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecretService } from '../aws/aws-secrets.service';
import { Attachment } from 'nodemailer/lib/mailer';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
    private secrets;
    private readonly pepipostApiUrl = 'https://emailapi.netcorecloud.net/v5.1/mail/send';
    private transporter: nodemailer.Transporter;

    constructor(
        private readonly httpService: HttpService,
        private readonly secretService: SecretService
    ) {}

    async onModuleInit() {
        try {
            this.secrets = await this.secretService?.getSecret();
            if (!this.secrets['PEPIPOST_API_KEY']) {
                throw new Error('Missing Pepipost credentials in secrets');
            }
            // Initialize Nodemailer transporter
            this.transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // use TLS for port 587
                auth: {
                    user: this.secrets['NODEMAILER_EMAIL'] || process.env.NODEMAILER_EMAIL,
                    pass: this.secrets['NODEMAILER_PASS'] || process.env.NODEMAILER_PASS
                }
            });
        } catch (error) {
            Logger.error('Failed to initialize secrets or Nodemailer transporter', error);
            throw new Error('Failed to initialize email service');
        }
    }

    // Send basic email via Pepipost API
    async sendEmail(to: string, subject: string, body: string) {
        const payload = {
            from: { email: 'care@acumengroup.in', name: 'Acumen Operations' },
            subject,
            content: [{ type: 'html', value: body }],
            personalizations: [{ to: [{ email: to }] }]
        };

        return this.sendPepipostEmail(payload);
    }

    // Send email with attachments
    async sendEmailWithAttachments(to: string, subject: string, body: string, attachments?: Attachment[]) {
        const payload = {
            from: { email: 'care@acumengroup.in', name: 'Acumen Operations' },
            subject,
            content: [{ type: 'html', value: body }],
            personalizations: [{ to: [{ email: to }] }],
            attachments: attachments?.map((attachment) => ({
                content: attachment.content?.toString('base64'),
                name: attachment.filename
                // type: attachment.contentType,
            }))
        };

        return this.sendPepipostEmail(payload);
    }

    // Send markdown email
    async sendMarkDownEmail(to: string, subject: string, markdown: string) {
        const payload = {
            from: { email: 'care@acumengroup.in', name: 'Acumen Operations' },
            subject,
            content: [{ type: 'html', value: markdown }],
            personalizations: [{ to: [{ email: to }] }]
        };

        return this.sendPepipostEmail(payload);
    }

    // Helper method to send email via Pepipost API
    private async sendPepipostEmail(payload: any) {
        try {
            const response = await lastValueFrom(
                this.httpService.post(this.pepipostApiUrl, payload, {
                    headers: {
                        api_key: this.secrets['PEPIPOST_API_KEY'],
                        'Content-Type': 'application/json'
                    }
                })
            );
            return response.data;
        } catch (error) {
            console.error('Error sending email via Pepipost API:', error.response?.data || error.message);
            throw new Error('Failed to send email via Pepipost API');
        }
    }

    // Send email with attachments via Nodemailer (for testing)
    async sendEmailWithNodemailer(to: string, subject: string, body: string, attachments?: Attachment[]) {
        const mailOptions: nodemailer.SendMailOptions = {
            from: this.secrets['NODEMAILER_EMAIL'],
            to,
            subject,
            html: body,
            attachments: attachments?.map((attachment) => {
                const content =
                    typeof attachment.content === 'string' && attachment.content.startsWith('data:')
                        ? Buffer.from(attachment.content.split(',')[1], 'base64')
                        : attachment.content;
                return {
                    filename: attachment.filename,
                    content,
                    contentType: attachment.contentType,
                    cid: attachment.cid, // For inline images
                    contentDisposition: attachment.disposition || 'attachment'
                };
            })
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            return info;
        } catch (error) {
            Logger.error(`Failed to send email to ${to} via Nodemailer`, {
                error: error.message,
                stack: error.stack,
                mailOptions: {
                    to,
                    subject,
                    attachments: attachments?.map((a) => ({
                        filename: a.filename,
                        contentType: a.contentType,
                        cid: a.cid,
                        disposition: a.disposition
                    }))
                }
            });
            throw new Error(`Failed to send email via Nodemailer: ${error.message}`);
        }
    }
}
