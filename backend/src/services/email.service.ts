/**
 * Mock Email Service for Password Reset
 * In production, this would use nodemailer, SendGrid, etc.
 */
export class EmailService {
    /**
     * Send password reset email
     */
    static async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:19006'}/reset-password?token=${token}`;

        console.log('-----------------------------------------');
        console.log(`📧 EMAILING: ${email}`);
        console.log('Subject: Password Reset Request');
        console.log(`Hi,\n\nYou requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`);
        console.log('-----------------------------------------');

        return true;
    }

    /**
     * Send confirmation email after password reset
     */
    static async sendPasswordResetConfirmation(email: string): Promise<boolean> {
        console.log('-----------------------------------------');
        console.log(`📧 EMAILING: ${email}`);
        console.log('Subject: Password Reset Successful');
        console.log(`Hi,\n\nYour password has been successfully reset. If you did not do this, please contact support immediately.`);
        console.log('-----------------------------------------');

        return true;
    }
}
