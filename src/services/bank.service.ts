import paystack from "@/config/paystack.js";

const getBanks = async () => {
  const { data } = await paystack.verification.fetchBanks({
    country: "Nigeria",
  });
  return data;
};

const validateBankAccount = async (accountNumber: string, bankCode: string) => {
  const response = await paystack.verification.resolveAccountNumber({
    account_number: accountNumber,
    //   bank_code: bankCode,
    bank_code: "001",
  });
  return response;
};

export default { getBanks, validateBankAccount };
