import config from "@/config/config.js";
import sendpulse from "sendpulse-api";
import currencyFormatter from "@/utils/currency-formatter.js";

const API_USER_ID = config.email.smtp.clientId;
const API_SECRET = config.email.smtp.clientSecret;

type EmailData = {
  toEmail: string | string[];
  toName?: string;
  subject: string;
  templateId: number;
  variables: object;
};

sendpulse.init(
  API_USER_ID,
  API_SECRET,
  "/tmp/sendpulse-token-storage",
  () => {},
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
      to: Array.isArray(toEmail)
        ? toEmail.map((email) => ({
            name: toName || "",
            email,
          }))
        : [
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
    templateId: 88004,
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

const portalOrderConfirmation = async ({
  toEmail,
  firstName,
  orderNumber,
  createdAt,
  products,
  deliveryAddress,
  deliveryMethod,
  subTotal,
  deliveryFee,
  totalAmount,
  paymentMade,
}: {
  toEmail: string;
  firstName: string;
  orderNumber: string;
  createdAt: string;
  products: { name: string; quantity: number; amount: number }[];
  deliveryAddress: string;
  deliveryMethod: string;
  subTotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMade: boolean;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: `Your Order Has Been Received — ${orderNumber}`,
    templateId: paymentMade ? 93250 : 87798,
    variables: {
      firstName,
      orderNumber,
      createdAt,
      products: products
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} x${p.quantity} - ${currencyFormatter(p.amount)}`,
        )
        .join("<br />"),
      deliveryAddress,
      deliveryMethod,
      subTotal: currencyFormatter(subTotal),
      deliveryFee: currencyFormatter(deliveryFee),
      totalAmount: currencyFormatter(totalAmount),
    },
  });
};

const adminOrderNotification = async ({
  toEmail,
  customerName,
  orderNumber,
  customerPhone,
  customerEmail,
  createdAt,
  products,
  deliveryAddress,
  deliveryMethod,
  subTotal,
  deliveryFee,
  totalAmount,
  paymentMade,
}: {
  toEmail: string[];
  customerName: string;
  orderNumber: string;
  customerPhone: string;
  customerEmail: string;
  createdAt: string;
  products: { name: string; quantity: number; amount: number }[];
  deliveryAddress: string;
  deliveryMethod: string;
  subTotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMade: boolean;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: `New Order Received — ${orderNumber}`,
    templateId: paymentMade ? 93341 : 87842,
    variables: {
      customerName,
      customerPhone,
      customerEmail,
      orderNumber,
      createdAt,
      products: products
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} x${p.quantity} - ${currencyFormatter(p.amount)}`,
        )
        .join("<br />"),
      deliveryAddress,
      deliveryMethod,
      subTotal: currencyFormatter(subTotal),
      deliveryFee: currencyFormatter(deliveryFee),
      totalAmount: currencyFormatter(totalAmount),
    },
  });
};
const adminOrderQuoteRequest = async ({
  toEmail,
  customerName,
  orderNumber,
  customerPhone,
  customerEmail,
  createdAt,
  products,
  note,
  fileUrl,
  deliveryAddress,
}: {
  toEmail: string[];
  customerName: string;
  orderNumber: string;
  customerPhone: string;
  customerEmail: string;
  createdAt: string;
  products?: { name: string; quantity: number }[];
  note?: string;
  fileUrl?: string;
  deliveryAddress: string;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: `New Quote Request — ${orderNumber}`,
    templateId: 87976,
    variables: {
      customerName,
      customerPhone,
      customerEmail,
      orderNumber,
      createdAt,
      products: products
        ? `
        Requested Items: <br />
        ${products
          .map((p, i) => `${i + 1}. ${p.name} x${p.quantity}`)
          .join("<br />")}`
        : "",
      note: note ? `Aditional Note: <br /> ${note}` : "",
      fileUrl: fileUrl ? `Attatched Document: <br /> ${fileUrl}` : "",
      deliveryAddress,
    },
  });
};
const portalOrderQuote = async ({
  toEmail,
  firstName,
  orderNumber,
  createdAt,
  products,
  note,
  fileUrl,
  deliveryAddress,
}: {
  toEmail: string;
  firstName: string;
  orderNumber: string;
  createdAt: string;
  products?: { name: string; quantity: number }[];
  note?: string;
  fileUrl?: string;
  deliveryAddress: string;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: `New Quote Request — ${orderNumber}`,
    templateId: 87978,
    variables: {
      firstName,
      orderNumber,
      createdAt,
      products: products
        ? `
        Requested Items: <br />
        ${products
          .map((p, i) => `${i + 1}. ${p.name} x${p.quantity}`)
          .join("<br />")}`
        : "",
      note: note ? `Aditional Note: <br /> ${note}` : "",
      fileUrl: fileUrl ? `Attatched Document: <br /> ${fileUrl}` : "",
      deliveryAddress,
    },
  });
};

const potalOrderPaymentConfirmed = async ({
  toEmail,
  firstName,
  orderNumber,
  createdAt,
  totalAmount,
}: {
  toEmail: string;
  firstName: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: `Payment Confirmed — ${orderNumber}`,
    templateId: 87854,
    variables: {
      firstName,
      orderNumber,
      createdAt,
      totalAmount: currencyFormatter(totalAmount),
    },
  });
};

const adminOrderPaymentConfirmed = async ({
  toEmail,
  customerName,
  orderNumber,
  createdAt,
  totalAmount,
}: {
  toEmail: string[];
  customerName: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: `Payment Confirmed — ${orderNumber}`,
    templateId: 87855,
    variables: {
      customerName,
      orderNumber,
      createdAt,
      totalAmount: currencyFormatter(totalAmount),
    },
  });
};

const portalOrderCancelled = async ({
  toEmail,
  firstName,
  orderNumber,
}: {
  toEmail: string;
  firstName: string;
  orderNumber: string;
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: `Order Cancelled — ${orderNumber}`,
    templateId: 87973,
    variables: {
      firstName,
      orderNumber,
    },
  });
};
const portalOrderDelivered = async ({
  toEmail,
  firstName,
  orderNumber,
  products,
}: {
  toEmail: string;
  firstName: string;
  orderNumber: string;
  products: { name: string; quantity: number; amount: number }[];
}) => {
  await sendEmailWithRetry({
    toEmail,
    subject: `Order Delivered — ${orderNumber}`,
    templateId: 87974,
    variables: {
      firstName,
      orderNumber,
      products: products
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} x${p.quantity} - ${currencyFormatter(p.amount)}`,
        )
        .join("<br />"),
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
    templateId: 84625,
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
    subject: "You've Been Enabled as a Referral Partner on Zowkins",
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
  portalOrderConfirmation,
  adminOrderNotification,
  adminOrderQuoteRequest,
  portalOrderQuote,
  potalOrderPaymentConfirmed,
  adminOrderPaymentConfirmed,
  portalOrderCancelled,
  portalOrderDelivered,
};
