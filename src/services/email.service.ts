import config from "@/config/config.js";
import sendpulse from "sendpulse-api";

const API_USER_ID = config.email.smtp.clientId;
const API_SECRET = config.email.smtp.clientSecret;

type EmailData = {
  toEmail: string;
  toName?: string;
  subject: string;
  templateId: number;
  variables: object;
};

sendpulse.init(
  API_USER_ID,
  API_SECRET,
  "/tmp/sendpulse-token-storage",
  () => {}
);

export const sendTemplateEmail = ({
  toEmail,
  toName,
  subject,
  templateId,
  variables,
}: EmailData) => {
  return new Promise((resolve, reject) => {
    const email = {
      html: "", // required but ignored when using template
      subject,
      from: {
        name: config.email.from.name,
        email: config.email.from.address,
      },
      to: [
        {
          name: toName || "",
          email: toEmail,
        },
      ],
      template: {
        id: templateId,
        variables,
      },
    };

    sendpulse.smtpSendMail((response: any) => {
      if (response?.result === true) {
        resolve(response);
      } else {
        reject(response);
      }
    }, email);
  });
};

async function sendEmailWithRetry(emailData: EmailData, retries = 3) {
  console.log(emailData);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sendTemplateEmail(emailData);
      console.log("Email sent successfully");
      break;
    } catch (error) {
      if (attempt === retries) {
        console.error("Failed to send email after multiple attempts:", error);
        throw error;
      }
      console.warn(`Attempt ${attempt} failed. Retrying...`);
    }
  }
}

const adminUserInvite = async ({
  toEmail,
  firstName,
  token,
}: {
  toEmail: string;
  firstName: string;
  token: string;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: "Admin User Invite",
    templateId: 66330,
    variables: {
      firstName,
      ctaLink: `${config.websiteUrl}/admin/accept-invite/${token}?firstName=${firstName}`,
    },
  });
};

const portalResetPassword = async ({
  toEmail,
  firstName,
  token,
}: {
  toEmail: string;
  firstName: string;
  token: string;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: "Reset Portal Password",
    templateId: 67060,
    variables: {
      firstName,
      ctaLink: `${config.websiteUrl}/portal/reset-password?token=${token}&firstName=${firstName}`,
    },
  });
};

const adminResetPassword = async ({
  toEmail,
  firstName,
  token,
}: {
  toEmail: string;
  firstName: string;
  token: string;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: "Reset Admin Password",
    templateId: 67528,
    variables: {
      firstName,
      ctaLink: `${config.websiteUrl}/admin/reset-password?token=${token}&firstName=${firstName}`,
    },
  });
};

const notifyAddedReferralPartner = async ({
  toEmail,
  firstName,
  professionalTitle,
}: {
  toEmail: string;
  firstName: string;
  professionalTitle: string;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: "You've Been Enabled as a Referral Partner on PharmaHub Medica",
    templateId: 67564,
    variables: {
      firstName,
      professionalTitle,
      ctaLink: `${config.websiteUrl}/portal/referrals`,
    },
  });
};

export default {
  sendEmailWithRetry,
  adminUserInvite,
  portalResetPassword,
  adminResetPassword,
  notifyAddedReferralPartner,
};
