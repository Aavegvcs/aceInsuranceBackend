export const insuranceTicketNotification = (email: string, title: string, message: string, name: string) => {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} - Acumen</title>
    </head>
    <body style="margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; text-decoration: none; background-color: #E6EEF6">
        <table role="presentation" style="width: 100%; max-width: 100%; background-color: #E6EEF6; margin: 0 auto; border-collapse: collapse">
            <tr>
                <td style="padding: 2rem">
                    <table role="presentation" style="width: 100%; max-width: 40rem; border-radius: 0.5rem; overflow: hidden; margin: 0 auto; border-collapse: collapse">
                      
                        
  
                        <!-- Gap -->
                        <tr><td style="height: 0.5rem; background-color: #E6EEF6"></td></tr>
  
                        <!-- MAIN CONTENT -->
                        <tr>
                            <td>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; padding: 2rem; text-align: center; border-radius: 0.5rem">
                                    <tr>
                                        <td>
                                          
                                            <p style="font-weight: 600; font-size: 1.2rem; margin-top: 1rem;">Ticket Details:</p>
                                            <p style="font-size: 1rem; color: #0F3057; background-color: #E6EEF6; padding: 0.7rem 1.2rem; border-radius: 1rem; display: inline-block;">
                                                ${title}
                                            </p>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin-top: 1rem">
                                                ${message}
                                            </p>
                                            <p style="font-weight: 400; font-size: 0.85rem; line-height: 1.25rem; margin-top: 0.5rem">
                                                Please address this issue promptly. If you have any questions, contact our support team.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
};