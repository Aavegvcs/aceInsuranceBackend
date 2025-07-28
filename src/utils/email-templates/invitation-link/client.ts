import { User } from 'src/modules/user/user.entity';

export const invitationLinkForClient = (user: User, link: string) => {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Client Portal Invitation - Acumen</title>
    </head>
    <body style="margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; text-decoration: none; background-color: #E6EEF6">
        <table role="presentation" style="width: 100%; max-width: 100%; background-color: #E6EEF6; margin: 0 auto; border-collapse: collapse">
            <tr>
                <td style="padding: 2rem">
                    <table role="presentation" style="width: 100%; max-width: 40rem; border-radius: 0.5rem; overflow: hidden; margin: 0 auto; border-collapse: collapse">
                        <!-- HEADER -->
                        <tr>
                            <td style="background: linear-gradient(180deg, rgba(226, 224, 238, 0) 0%, #EEF7EC 100%), linear-gradient(90deg, #4DAA3F 5.13%, #0055A5 100%); padding: 2rem 3rem; border-radius: 0.5rem; text-align: center">
                                <div style="background-color: #E6EEF6; padding: 0.5rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center">
                                    <img src="https://acumen-public.s3.ap-south-1.amazonaws.com/logo-icon.png" alt="Acumen Logo" style="width: 3.5rem; height: 3.5rem" />
                                </div>
                                <h1 style="font-size: 1.75rem; color: #000; line-height: 2rem">Welcome to Acumen</h1>
                                <p style="font-size: 0.85rem; color: #000; font-weight: 400; line-height: 1rem">
                                    Hi, ${user?.firstName},<br />
                                    We’re excited to have you onboard and look forward to supporting you on your journey to financial growth.
                                </p>
                            </td>
                        </tr>

                        <!-- Gap Row -->
                        <tr>
                            <td style="height: 0.5rem; background-color: #E6EEF6"></td>
                        </tr>

                        <!-- MAIN -->
                        <tr>
                            <td>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; padding: 2rem; text-align: center; border-radius: 0.5rem">
                                    <tr>
                                        <td>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0">To get started, please log in to the Acumen portal using the link below:</p>
                                            <a href="${link}" style="background-color: #0F3057; border-radius: 0.25rem; padding: 0.6rem 1rem; color: #fff; text-decoration: none; display: inline-block; margin-top: 1rem; font-size: 1rem">Open Portal</a>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 1rem">Through the portal, you can view your account details, access investment information, and stay connected with our team.</p>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 1rem">If you have any questions or need help accessing your account, feel free to reach out.</p>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 1rem">We're thrilled to have you with us!</p>
                                            <a href="https://acumengroup.in/contact" style="background-color: #0F3057; border-radius: 0.25rem; padding: 0.6rem 1rem; color: #fff; text-decoration: none; display: inline-block; margin-top: 1rem; font-size: 1rem">Contact Us</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Gap Row -->
                        <tr>
                            <td style="height: 0.5rem; background-color: #E6EEF6"></td>
                        </tr>

                        <!-- FOOTER -->
                        <tr>
                            <td style="background-color: #0055A5; padding: 1.5rem; text-align: center; border-radius: 0.5rem">
                                <div>
                                    <label style="color: #DBEED9; font-size: 0.75rem">Follow Us On</label>
                                    <div style="width: auto; margin-top: 0.5rem">
                                        <a href="https://www.facebook.com/myacumencapital" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                            <img src="https://acumen-public.s3.ap-south-1.amazonaws.com/fb.png" alt="facebook" style="width: 1.25rem; height: 1.25rem" />
                                        </a>
                                        <a href="https://www.instagram.com/myacumengroup/" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                            <img src="https://acumen-public.s3.ap-south-1.amazonaws.com/insta.png" alt="instagram" style="width: 1.25rem; height: 1.25rem" />
                                        </a>
                                        <a href="https://www.linkedin.com/company/acumen-capital-market" style="display: inline; margin-right: 0.25rem; text-decoration: none">
                                            <img src="https://acumen-public.s3.ap-south-1.amazonaws.com/linkedin.png" alt="linkedin" style="width: 1.25rem; height: 1.25rem" />
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
    </html>`;
};