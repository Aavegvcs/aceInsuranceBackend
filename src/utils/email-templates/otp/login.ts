export const otpForLogin = (otp: string) => {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification - Acumen</title>
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
                                <h1 style="font-size: 1.75rem; color: #000; line-height: 2rem">Email Verification</h1>
                                <p style="font-size: 0.85rem; color: #000; font-weight: 400; line-height: 1rem">We noticed a sign-in attempt to your account and need to verify it's really you. Please use the one-time password (OTP) below to complete your sign-in:</p>
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
                                            <p style="font-weight: 700; font-size: 1.75rem; line-height: 1.25rem; margin: 0; background-color: #E6EEF6; color: #0F3057; padding: 0.75rem 1rem; letter-spacing: 0.5rem; border-radius: 2rem; max-width: max-content; margin-left: auto; margin-right: auto">${otp}</p>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 1rem">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 0.5rem">If you did not attempt to sign in, please contact our support team immediately.</p>
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



export const passwordForInsuranceLogin = (email: string, generatedPass: string, name: string) => {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Acumen</title>
    </head>

    <body style="margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; text-decoration: none; background-color: #E6EEF6">
        <table role="presentation" style="width: 100%; max-width: 100%; background-color: #E6EEF6; margin: 0 auto; border-collapse: collapse">
        <tr>
            <td style="padding: 2rem">
            <table role="presentation" style="width: 100%; max-width: 40rem; border-radius: 0.5rem; overflow: hidden; margin: 0 auto; border-collapse: collapse">
                <!-- HEADER -->
                <tr>
                <td style="background: linear-gradient(180deg, rgba(226, 224, 238, 0) 0%, #EEF7EC 100%), linear-gradient(90deg, #4DAA3F 5.13%, #0055A5 100%); padding: 2rem 3rem; border-radius: 0.5rem; text-align: center">
                    <!-- HEADER : LOGO -->
                    <div style="background-color: #E6EEF6; padding: 0.5rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center">
                    <img src="https://i.ibb.co/YTcLbDwt/logo-icon.png" alt="Acumen Logo" style="width: 3.5rem; height: 3.5rem" />
                    </div>
                    <!-- HEADER : CONTENT -->
                    <h1 style="font-size: 1.75rem; color: #000; line-height: 2rem">Welcome to Acumen</h1>
                    <p style="font-size: 0.85rem; color: #000; font-weight: 400; line-height: 1rem">Hi, ${name},<br>Your account has been created successfully. Below are your login credentials to access your Acumen account.</p>
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
                    <!-- MAIN : CONTENT -->
                    <tr>
                        <td>
                        <p style="font-weight: 600; font-size: 1rem; line-height: 1.5rem; margin: 0;">User ID: <span style="color: #0F3057">${email}</span></p>
                        <p style="font-weight: 600; font-size: 1rem; line-height: 1.5rem; margin: 0; margin-top: 0.5rem;">Temporary Password: <span style="color: #0F3057; background-color: #E6EEF6; padding: 0.5rem 1rem; border-radius: 1rem;">${generatedPass}</span></p>
                        <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin: 0; margin-top: 1rem">Please use these credentials to log in and change your password immediately for security purposes.</p>
                        <a href="https://acumengroup.in/contact" style="background-color: #0F3057; border-radius: 0.25rem; padding: 0.6rem 1rem; color: #fff; text-decoration: none; display: inline-block; margin-top: 1rem; font-size: 1rem">Contact Us</a>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>

                <!-- Gap Row -->
                <tr>
               <!-- <td style="height: 0.5rem; background-color: #E6EEF6"></td> -->
                </tr>

                <!-- FOOTER -->
               <!-- <tr>
                <td style="background-color: #0055A5; padding: 1.5rem; text-align: center; border-radius: 0.5rem">
                    <h3 style="color: #fff; font-size: 1.3rem; font-weight: 600; margin: 0; margin-top: 8px">We Help you Invest right</h3>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: auto">
                    <tr>
                        <td align="center" style="padding: 20px">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse">
                            <tr>
                            <!-- First Table -->
                            <td style="padding: 5px">
                                <a href="tel:+919495998191" style="display: block; text-decoration: none">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; width: auto; margin: auto">
                                    <tr>
                                    <td style="padding: 10px; text-align: center; padding-top: 15px; padding-bottom: 5px">
                                        <img src="https://logo-public-its.s3.amazonaws.com/support.png" alt="Phone Icon" width="50" height="50" style="display: block; margin: 0 auto" />
                                    </td>
                                    </tr>
                                    <tr>
                                    <td style="padding: 10px; text-align: center">
                                        <div style="color: #E6EEF6; font-size: 12px; margin-bottom: 5px">Customer Support</div>
                                        <div style="color: #fff; font-size: 14px">+91 94959 98191</div>
                                    </td>
                                    </tr>
                                </table>
                                </a>
                            </td>

                            <!-- Gap TD -->
                            <td style="width: 2rem"></td>

                            <!-- Second Table -->
                            <td style="padding: 5px">
                                <a href="mailto:care@acumengroup.in" style="display: block; text-decoration: none">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; width: auto; margin: auto">
                                    <tr>
                                    <td style="padding: 10px; text-align: center; padding-top: 20px">
                                        <img src="https://logo-public-its.s3.amazonaws.com/email.png" alt="Email Icon" width="50" height="40" style="display: block; margin: 0 auto" />
                                    </td>
                                    </tr>
                                    <tr>
                                    <td style="padding: 10px; text-align: center">
                                        <div style="color: #DBEED9; font-size: 12px; margin-bottom: 5px">Email Us</div>
                                        <div style="color: #fff; font-size: 14px">care@acumengroup.in</div>
                                    </td>
                                    </tr>
                                </table>
                                </a>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr> -->
                    </table>
                    <div>
                    <label style="color: #DBEED9; font-size: 0.75rem">Follow Us On</label>
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
    </html>`;
};

export const sendOtpForForgotPassword = (email: string, otp: string, name: string) => {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset OTP - Acumen</title>
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
                                    <img src="https://i.ibb.co/YTcLbDwt/logo-icon.png" alt="Acumen Logo" style="width: 3.5rem; height: 3.5rem" />
                                </div>
                                <h1 style="font-size: 1.75rem; color: #000; line-height: 2rem">Reset Your Password</h1>
                                <p style="font-size: 0.85rem; color: #000; font-weight: 400; line-height: 1rem">
                                    Hi, ${name},<br />
                                    You have requested to reset your password. Please use the OTP below to proceed.
                                </p>
                            </td>
                        </tr>
  
                        <!-- Gap -->
                        <tr><td style="height: 0.5rem; background-color: #E6EEF6"></td></tr>
  
                        <!-- MAIN CONTENT -->
                        <tr>
                            <td>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; padding: 2rem; text-align: center; border-radius: 0.5rem">
                                    <tr>
                                        <td>
                                            <p style="font-weight: 600; font-size: 1rem; line-height: 1.5rem; margin: 0;">User ID: <span style="color: #0F3057">${email}</span></p>
                                            <p style="font-weight: 600; font-size: 1.2rem; margin-top: 1rem;">Your OTP:</p>
                                            <p style="font-size: 1.5rem; color: #0F3057; background-color: #E6EEF6; padding: 0.7rem 1.2rem; border-radius: 1rem; display: inline-block; letter-spacing: 2px;">
                                                ${otp}
                                            </p>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin-top: 1rem">
                                                This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
                                            </p>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin-top: 0.5rem">
                                                If you did not request a password reset, please ignore this email.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
  
                        <!-- Gap -->
                       <!--   <tr><td style="height: 0.5rem; background-color: #E6EEF6"></td></tr> -->
  
                        <!-- FOOTER -->
                     <!--   <tr>
                            <td style="background-color: #0055A5; padding: 1.5rem; text-align: center; border-radius: 0.5rem">
                                <h3 style="color: #fff; font-size: 1.3rem; font-weight: 600; margin: 0; margin-top: 8px">We Help You Invest Right</h3>
                                <table role="presentation" width="100%" style="max-width: 600px; margin: auto">
                                    <tr>
                                        <td align="center" style="padding: 20px">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto">
                                                <tr>
                                                    <td style="padding: 10px; text-align: center">
                                                        <img src="https://logo-public-its.s3.amazonaws.com/support.png" alt="Phone Icon" width="50" height="50" style="display: block; margin: 0 auto" />
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="text-align: center">
                                                        <div style="color: #E6EEF6; font-size: 12px;">Customer Support</div>
                                                        <div style="color: #fff; font-size: 14px">+91 94959 98191</div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr> -->
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
  };
  