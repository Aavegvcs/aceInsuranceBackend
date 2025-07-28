import { Injectable, Logger } from '@nestjs/common';
import { Roles } from '../../utils/app.utils';
import { EmailService } from '../email/email.service';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { User } from '../user/user.entity';
import { SecretService } from '../aws/aws-secrets.service';
import { otpForLogin } from 'src/utils/email-templates/otp/login';
// const marked = require('marked');

@Injectable()
export class NotificationService {
    constructor(
        private readonly emailService: EmailService,
        private authService: AuthService,
        private secretService: SecretService
    ) { }

    async sendOTP(userEmail: string, OTP: string): Promise<any> {
        let htmlContent = otpForLogin(OTP);
        return await this.emailService.sendEmail(userEmail, 'Verify OTP', htmlContent);
    }

    async sendOneTimeResetLink({
        userEmail,
        subject,
        body = ''
    }: {
        userEmail: string;
        subject: string;
        body?: string;
    }): Promise<any> {
        return await this.emailService.sendEmailWithNodemailer(userEmail, subject, body);
    }

    async sendApptRequestDetails(
        userEmail: string,
        details: {
            clientName?: string;
            clientEmail?: string;
            staffName?: string;
            staffEmail?: string;
            clientDate?: string;
            clientStartTime?: string;
            clientEndTime?: string;
            clientTimeZone?: string;
            staffTimeZone?: string;
            staffDate?: string;
            'Start-Time'?: moment.Moment;
            'End-Time'?: moment.Moment;
            userType: Roles.client | Roles.staff;
        }
    ): Promise<any> {
        const { userType } = details;

        let htmlContent = ``;

        if (userType === Roles.client) {
            htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Matchmaking Appointment Scheduled!</title>
                </head>

                <body style="margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; text-decoration: none; background-color: #f2f0f9">
                    <table role="presentation" style="width: 100%; max-width: 100%; background-color: #f2f0f9; margin: 0 auto; border-collapse: collapse">
                    <tr>
                        <td style="padding: 2rem">
                        <table role="presentation" style="width: 100%; max-width: 40rem; border-radius: 0.5rem; overflow: hidden; margin: 0 auto; border-collapse: collapse">
                            <!-- HEADER -->
                            <tr>
                            <td style="background: linear-gradient(180deg, rgba(226, 224, 238, 0) 0%, #e2e0ee 100%), linear-gradient(90deg, #e99ff4 5.13%, #bbb5ea 100%); padding: 2rem 3rem; border-radius: 0.5rem; text-align: center">
                                <!-- HEADER : LOGO -->
                                <div style="background-color: #f2f0f9; padding: 0.5rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center">
                                <img src="https://logo-public-its.s3.amazonaws.com/ITS-icon.png" alt="Insight Therapy Solutions Logo" style="width: 3.5rem; height: 3.5rem" />
                                </div>
                                <!-- HEADER : CONTENT -->
                                <h3 style="margin-top: 1.5rem; color: #4a3889; font-size: 1.1rem">Dear ${details?.clientName},</h3>
                                <h1 style="font-size: 1.75rem; color: #000; line-height: 2rem">Thank you for scheduling a matchmaking session with us!</h1>
                                <p style="font-size: 0.85rem; color: #000; font-weight: 400; line-height: 1rem">I'm <span style="font-weight: 600">${details?.staffName}</span>, and I'll be your point of contact for our upcoming matchmaking session. I'm really looking forward to our phone call and getting to know more about what you're looking for.</p>
                            </td>
                            </tr>

                            <!-- Gap Row -->
                            <tr>
                            <td style="height: 0.5rem; background-color: #f2f0f9"></td>
                            </tr>

                            <!-- MAIN -->
                            <tr>
                            <td>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; padding: 2rem; text-align: center; border-radius: 0.5rem">
                                <!-- MAIN : TITLE -->
                                <tr>
                                    <td style="text-align: center">
                                    <h3 style="background-color: #f2f1f9; padding: 0.5rem 1.1rem; border-radius: 10rem; font-size: 1rem; margin: 0; max-width: fit-content; display: inline-block">Your Meeting Details</h3>
                                    </td>
                                </tr>

                                <!-- Gap Row -->
                                <tr>
                                    <td style="height: 1rem"></td>
                                </tr>

                                <!-- MAIN : MEETING HIGHLIGHT CONTAINER -->
                                <tr>
                                    <td>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1.5px solid #f2f1f9; border-radius: 0.5rem; margin: 0 auto; max-width: 80%">
                                        <tr>
                                        <td style="padding: 1rem 1.5rem; border-right: 1.5px solid #f2f1f9; text-align: center">
                                            <img src="https://logo-public-its.s3.amazonaws.com/profile.png" alt="Phone Icon" width="30" height="30" style="display: block; border: none; margin: 0 auto" />
                                            <div style="margin-top: 0.75rem">
                                            <div style="text-transform: uppercase; font-size: 0.6rem; font-weight: 600; opacity: 0.3">Staff Member</div>
                                            <div style="font-size: 1rem; color: #4c3987; font-weight: 500; margin-top: 0.25rem">${details?.staffName}</div>
                                            </div>
                                        </td>
                                        <td style="padding: 1rem 1.5rem; text-align: center">
                                            <img src="https://logo-public-its.s3.amazonaws.com/clock.png" alt="Phone Icon" width="30" height="30" style="display: block; border: none; margin: 0 auto" />
                                            <div style="margin-top: 0.75rem">
                                            <div style="text-transform: uppercase; font-size: 0.6rem; font-weight: 600; opacity: 0.3">Date / Time</div>
                                            <div style="font-size: 1rem; color: #4c3987; font-weight: 500; margin-top: 0.25rem">${details?.clientDate} at ${details?.clientStartTime} - ${details?.clientEndTime} ${details?.clientTimeZone}</div>
                                            </div>
                                        </td>
                                        </tr>
                                    </table>
                                    </td>
                                </tr>

                                <!-- Gap Row -->
                                <tr>
                                    <td style="height: 1rem"></td>
                                </tr>

                                <!-- MAIN : CONTENT -->
                                <tr>
                                    <td>
                                    <p style="font-weight: 600; font-size: 0.85rem; line-height: 1.25rem; margin: 0">Please ensure you're in a quiet and comfortable spot for our conversation.</p>
                                    <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 0.25rem">If you need to adjust the time or have any questions before our call, feel free to reach out to me directly at <a href="mailto:${details?.staffEmail}" style="font-weight: 600; color: #d05f95">${details?.staffEmail}</a></p>
                                    <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 0.25rem">I look forward to speak with you and assisting you on this journey!</p>
                                    <a href="https://stagewebsite.insighttherapysolutions.com/contact-us" style="background-color: #4c3987; border-radius: 0.25rem; padding: 0.6rem 1rem; color: #fff; text-decoration: none; display: inline-block; margin-top: 1rem; font-size: 1rem"> Contact Us </a>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>

                            <!-- Gap Row -->
                            <tr>
                            <td style="height: 0.5rem; background-color: #f2f0f9"></td>
                            </tr>

                            <!-- FOOTER -->
                            <tr>
                            <td style="background-color: #4d3989; padding: 1.5rem; text-align: center; border-radius: 0.5rem">
                                <h3 style="color: #fff; font-size: 1.3rem; font-weight: 600; margin: 0; margin-top: 8px">Reclaim Your Mental Health</h3>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: auto">
                                <tr>
                                    <td align="center" style="padding: 20px">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse">
                                        <tr>
                                        <!-- First Table -->
                                        <td style="padding: 5px; padding-left: 2.25rem">
                                            <a href="tel:+18884098976" style="display: block; text-decoration: none">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; width: auto; margin: auto">
                                                <tr>
                                                <td style="padding: 10px; text-align: center; padding-top: 15px; padding-bottom: 5px">
                                                    <img src="https://logo-public-its.s3.amazonaws.com/support.png" alt="Phone Icon" width="50" height="50" style="display: block; margin: 0 auto" />
                                                </td>
                                                </tr>
                                                <tr>
                                                <td style="padding: 10px; text-align: center">
                                                    <div style="color: #c4b2f7; font-size: 12px; margin-bottom: 5px">Customer Support</div>
                                                    <div style="color: #fff; font-size: 14px">888-409-8976</div>
                                                </td>
                                                </tr>
                                            </table>
                                            </a>
                                        </td>

                                        <!-- Gap TD -->
                                        <td style="width: 1rem"></td>

                                        <!-- Second Table -->
                                        <td style="padding: 5px; padding-left: 4rem">
                                            <a href="mailto:inquiries@insighttherapy.us" style="display: block; text-decoration: none">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; width: auto; margin: auto">
                                                <tr>
                                                <td style="padding: 10px; text-align: center; padding-top: 20px">
                                                    <img src="https://logo-public-its.s3.amazonaws.com/email.png" alt="Email Icon" width="50" height="40" style="display: block; margin: 0 auto" />
                                                </td>
                                                </tr>
                                                <tr>
                                                <td style="padding: 10px; text-align: center">
                                                    <div style="color: #c4b2f7; font-size: 12px; margin-bottom: 5px">Email Us</div>
                                                    <div style="color: #fff; font-size: 14px">inquiries@insighttherapy.us</div>
                                                </td>
                                                </tr>
                                            </table>
                                            </a>
                                        </td>
                                        </tr>
                                    </table>
                                    </td>
                                </tr>
                                </table>
                                <div>
                                <label style="color: #c4b2f7; font-size: 0.75rem">Follow Us On</label>
                                <div style="width: auto; margin-top: 0.5rem">
                                    <a href="https://www.facebook.com/insighttherapysolutions" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/fb.webp" alt="facebook" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.instagram.com/insighttherapy.nevada/" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/insta.webp" alt="instagram" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.tiktok.com/@insighttherapysolutions" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/tk.webp" alt="tiktok" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.youtube.com/channel/UCxOxr-fXhVVp4nyDcBhFT0A" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/yt.webp" alt="youtube" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.linkedin.com/company/insighttherapysolutions" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/in.webp" alt="linkedin" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://twitter.com/InsightTherapyS" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/tw.webp" alt="twitter" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.pinterest.com/insighttherapysolutions2012/" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/pn.webp" alt="pinterest" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                </div>
                                </div>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    </table>
                </body>
                </html>
            `;
        }
        if (userType === Roles.staff) {
            htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Matchmaking Appointment Scheduled!</title>
                </head>

                <body style="margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; text-decoration: none; background-color: #f2f0f9">
                    <table role="presentation" style="width: 100%; max-width: 100%; background-color: #f2f0f9; margin: 0 auto; border-collapse: collapse">
                    <tr>
                        <td style="padding: 2rem">
                        <table role="presentation" style="width: 100%; max-width: 40rem; border-radius: 0.5rem; overflow: hidden; margin: 0 auto; border-collapse: collapse">
                            <!-- HEADER -->
                            <tr>
                            <td style="background: linear-gradient(180deg, rgba(226, 224, 238, 0) 0%, #e2e0ee 100%), linear-gradient(90deg, #e99ff4 5.13%, #bbb5ea 100%); padding: 2rem 3rem; border-radius: 0.5rem; text-align: center">
                                <!-- HEADER : LOGO -->
                                <div style="background-color: #f2f0f9; padding: 0.5rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center">
                                <img src="https://logo-public-its.s3.amazonaws.com/ITS-icon.png" alt="Insight Therapy Solutions Logo" style="width: 3.5rem; height: 3.5rem" />
                                </div>
                                <!-- HEADER : CONTENT -->
                                <h3 style="margin-top: 1.5rem; color: #4a3889; font-size: 1.1rem">Dear ${details?.staffName},</h3>
                                <h1 style="font-size: 1.75rem; color: #000; line-height: 2rem">You have a meeting scheduled with ${details?.clientName}!</h1>
                                <p style="font-size: 0.85rem; color: #000; font-weight: 400; line-height: 1rem">We wanted to inform you that a new matchmaking session has been scheduled.</p>
                            </td>
                            </tr>

                            <!-- Gap Row -->
                            <tr>
                            <td style="height: 0.5rem; background-color: #f2f0f9"></td>
                            </tr>

                            <!-- MAIN -->
                            <tr>
                            <td>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; padding: 2rem; text-align: center; border-radius: 0.5rem">
                                <!-- MAIN : TITLE -->
                                <tr>
                                    <td style="text-align: center">
                                    <h3 style="background-color: #f2f1f9; padding: 0.5rem 1.1rem; border-radius: 10rem; font-size: 1rem; margin: 0; max-width: fit-content; display: inline-block">Your Meeting Details</h3>
                                    </td>
                                </tr>

                                <!-- Gap Row -->
                                <tr>
                                    <td style="height: 1rem"></td>
                                </tr>

                                <!-- MAIN : MEETING HIGHLIGHT CONTAINER -->
                                <tr>
                                    <td>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1.5px solid #f2f1f9; border-radius: 0.5rem; margin: 0 auto; max-width: 80%">
                                        <tr>
                                        <td style="padding: 1rem 1.5rem; border-right: 1.5px solid #f2f1f9; text-align: center">
                                            <img src="https://logo-public-its.s3.amazonaws.com/profile.png" alt="Phone Icon" width="30" height="30" style="display: block; border: none; margin: 0 auto" />
                                            <div style="margin-top: 0.75rem">
                                            <div style="text-transform: uppercase; font-size: 0.6rem; font-weight: 600; opacity: 0.3">Client</div>
                                            <div style="font-size: 1rem; color: #4c3987; font-weight: 500; margin-top: 0.25rem">${details?.clientName}</div>
                                            </div>
                                        </td>
                                        <td style="padding: 1rem 1.5rem; text-align: center">
                                            <img src="https://logo-public-its.s3.amazonaws.com/clock.png" alt="Phone Icon" width="30" height="30" style="display: block; border: none; margin: 0 auto" />
                                            <div style="margin-top: 0.75rem">
                                            <div style="text-transform: uppercase; font-size: 0.6rem; font-weight: 600; opacity: 0.3">Date / Time</div>
                                            <div style="font-size: 1rem; color: #4c3987; font-weight: 500; margin-top: 0.25rem">${details?.staffDate} at ${details?.['Start-Time'].format('hh:mm A')} - ${details?.['End-Time'].format('hh:mm A')} ${details?.staffTimeZone}</div>
                                            </div>
                                        </td>
                                        </tr>
                                    </table>
                                    </td>
                                </tr>

                                <!-- Gap Row -->
                                <tr>
                                    <td style="height: 1rem"></td>
                                </tr>

                                <!-- MAIN : CONTENT -->
                                <tr>
                                    <td>
                                    <p style="font-weight: 600; font-size: 0.85rem; line-height: 1.25rem; margin: 0">Thank you for your commitment to providing exceptional care to our clients.</p>
                                    <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 0.25rem">If you have any question or need assistance, please don't hesitate to reach out.</p>
                                    <a href="https://stagewebsite.insighttherapysolutions.com/contact-us" style="background-color: #4c3987; border-radius: 0.25rem; padding: 0.6rem 1rem; color: #fff; text-decoration: none; display: inline-block; margin-top: 1rem; font-size: 1rem"> Contact Us </a>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>

                            <!-- Gap Row -->
                            <tr>
                            <td style="height: 0.5rem; background-color: #f2f0f9"></td>
                            </tr>

                            <!-- FOOTER -->
                            <tr>
                            <td style="background-color: #4d3989; padding: 1.5rem; text-align: center; border-radius: 0.5rem">
                                <h3 style="color: #fff; font-size: 1.3rem; font-weight: 600; margin: 0; margin-top: 8px">Reclaim Your Mental Health</h3>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: auto">
                                <tr>
                                    <td align="center" style="padding: 20px">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse">
                                        <tr>
                                        <!-- First Table -->
                                        <td style="padding: 5px">
                                            <a href="tel:+18884098976" style="display: block; text-decoration: none">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; width: auto; margin: auto">
                                                <tr>
                                                <td style="padding: 10px; text-align: center; padding-top: 15px; padding-bottom: 5px">
                                                    <img src="https://logo-public-its.s3.amazonaws.com/support.png" alt="Phone Icon" width="50" height="50" style="display: block; margin: 0 auto" />
                                                </td>
                                                </tr>
                                                <tr>
                                                <td style="padding: 10px; text-align: center">
                                                    <div style="color: #c4b2f7; font-size: 12px; margin-bottom: 5px">Customer Support</div>
                                                    <div style="color: #fff; font-size: 14px">888-409-8976</div>
                                                </td>
                                                </tr>
                                            </table>
                                            </a>
                                        </td>

                                        <!-- Gap TD -->
                                        <td style="width: 2rem"></td>

                                        <!-- Second Table -->
                                        <td style="padding: 5px">
                                            <a href="mailto:inquiries@insighttherapy.us" style="display: block; text-decoration: none">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; width: auto; margin: auto">
                                                <tr>
                                                <td style="padding: 10px; text-align: center; padding-top: 20px">
                                                    <img src="https://logo-public-its.s3.amazonaws.com/email.png" alt="Email Icon" width="50" height="40" style="display: block; margin: 0 auto" />
                                                </td>
                                                </tr>
                                                <tr>
                                                <td style="padding: 10px; text-align: center">
                                                    <div style="color: #c4b2f7; font-size: 12px; margin-bottom: 5px">Email Us</div>
                                                    <div style="color: #fff; font-size: 14px">inquiries@insighttherapy.us</div>
                                                </td>
                                                </tr>
                                            </table>
                                            </a>
                                        </td>
                                        </tr>
                                    </table>
                                    </td>
                                </tr>
                                </table>
                                <div>
                                <label style="color: #c4b2f7; font-size: 0.75rem">Follow Us On</label>
                                <div style="width: auto; margin-top: 0.5rem">
                                    <a href="https://www.facebook.com/insighttherapysolutions" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/fb.webp" alt="facebook" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.instagram.com/insighttherapy.nevada/" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/insta.webp" alt="instagram" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.tiktok.com/@insighttherapysolutions" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/tk.webp" alt="tiktok" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.youtube.com/channel/UCxOxr-fXhVVp4nyDcBhFT0A" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/yt.webp" alt="youtube" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.linkedin.com/company/insighttherapysolutions" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/in.webp" alt="linkedin" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://twitter.com/InsightTherapyS" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/tw.webp" alt="twitter" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                    <a href="https://www.pinterest.com/insighttherapysolutions2012/" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                    <img src="https://logo-public-its.s3.amazonaws.com/pn.webp" alt="pinterest" style="width: 1.25rem; height: 1.25rem" />
                                    </a>
                                </div>
                                </div>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    </table>
                </body>
                </html>
            `;
        }
        return await this.emailService.sendEmail(userEmail, 'Your Request Details', htmlContent);
    }

    async sendClientDashboardReport({
        to,
        subject,
        body,
        attachments,
    }: {
        to: string;
        subject: string;
        body: string;
        attachments?: any[];
    }): Promise<any> {
        try {
            attachments?.forEach((att, i) => {
                if (att.content && att.content.type === 'Buffer' && Array.isArray(att.content.data)) {
                    att.content = Buffer.from(att.content.data); // ✅ Restore real buffer
                }

                if (!Buffer.isBuffer(att.content) && typeof att.content !== 'string') {
                    throw new Error(`Invalid attachment content for ${att.filename}`);
                }
            });

            return await this.emailService.sendEmailWithAttachments(to, subject, body, attachments);
        } catch (error) {
            Logger?.error?.('Failed to send client dashboard report:', error);
            throw new Error(`sendClientDashboardReport error: ${error.message}`);
        }
    }

}
