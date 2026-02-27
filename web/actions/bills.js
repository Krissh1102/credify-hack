// actions/bills.js

// Example: fetch bills for a user (replace with real DB/logic)
export async function getUserBills(userId) {
  // Simulate API call or use DB logic here
  return [
    // Example bills
    {
      id: "bill1",
      title: "Electricity Bill",
      amount: 1200,
      date: "2025-10-07",
      type: "bill",
      status: "due"
    },
    {
      id: "bill2",
      title: "Phone Bill",
      amount: 750,
      date: "2025-10-10",
      type: "bill",
      status: "paid"
    },
  ];
}
