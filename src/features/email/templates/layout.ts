export function emailLayout(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; padding: 40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background-color: #0f172a; padding: 24px 32px;">
                <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Nessi</span>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding: 32px;">
                ${body}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                  You're receiving this email because you have an account on Nessi. If you believe this was sent in error, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
