
import nodemailer from "nodemailer";

const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    });

export const sendMembershipConfirmationEmail = async ({
    user,
    payment,
    dailyDownloadLimit,
}) => {
    if (
        !process.env.EMAIL_HOST ||
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASS
    ) {
        console.warn(
            "Membership email skipped: configure EMAIL_HOST, EMAIL_USER and EMAIL_PASS in server/.env"
        );
        return false;
    }

    if (!user?.email) {
        console.warn("Membership email skipped: user has no email address.");
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT || 587),
        secure: Number(process.env.EMAIL_PORT || 587) === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const planName =
        payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1);

    const invoiceNumber = `YT-${String(payment._id).slice(-10).toUpperCase()}`;

    const activationDate = formatDate(payment.activatedAt);
    const expiryDate = formatDate(payment.expiresAt);
    const amount = Number(payment.amount).toFixed(2);

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222">
        <h1 style="color:#2563eb">YourTube</h1>
        <h2>Membership confirmation</h2>
        <p>Hello ${escapeHtml(user.name || "YourTube member")},</p>
        <p>Your simulated membership payment was successful, and your membership is now active.</p>

        <h3>Receipt / Invoice</h3>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:10px;border:1px solid #ddd">Invoice reference</td>
              <td style="padding:10px;border:1px solid #ddd">${invoiceNumber}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd">Payment reference</td>
              <td style="padding:10px;border:1px solid #ddd">${escapeHtml(payment.reference)}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd">Membership</td>
              <td style="padding:10px;border:1px solid #ddd">${planName}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd">Demo amount</td>
              <td style="padding:10px;border:1px solid #ddd">₹${amount} INR</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd">Activation date</td>
              <td style="padding:10px;border:1px solid #ddd">${activationDate}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd">Expiry date</td>
              <td style="padding:10px;border:1px solid #ddd">${expiryDate}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd">Daily download limit</td>
              <td style="padding:10px;border:1px solid #ddd">${dailyDownloadLimit}</td></tr>
        </table>

        <p style="margin-top:20px;padding:12px;background:#fff4e5;border:1px solid #ffd08a">
          Demo transaction only: no real payment was processed, and no money was charged.
        </p>
        <p>Thank you for using YourTube!</p>
        <p style="font-size:12px;color:#666">This is an automatically generated demo receipt.</p>
      </div>
    `;

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: user.email,
        subject: `YourTube ${planName} membership confirmation — ${invoiceNumber}`,
        text: [
            "YourTube membership confirmation",
            `Membership: ${planName}`,
            `Demo amount: INR ${amount}`,
            `Payment reference: ${payment.reference}`,
            `Activation date: ${activationDate}`,
            `Expiry date: ${expiryDate}`,
            `Daily download limit: ${dailyDownloadLimit}`,
            "Demo transaction only: no real payment was processed.",
        ].join("\n"),
        html,
    });

    console.log("Membership confirmation email sent:", info.messageId);
    return true;
};

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);
}
