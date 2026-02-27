"use client";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExpenseCalendar() {
  const [expenses, setExpenses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "Food", note: "" });

 useEffect(() => {
  fetch("/api/expenses")
    .then((res) => res.json())
    .then((data) => {
      // Only set if it's an array
      if (Array.isArray(data)) setExpenses(data);
      else setExpenses([]);
    });
}, []);

const getTransactionsForDay = (day) => {
  return transactions.filter((t) => {
    const txDate = new Date(t.date);  // Supabase `date` field
    return isSameDay(day, txDate);
  });
};

  const handleAddExpense = async () => {
    const newExpense = {
      ...form,
      amount: parseFloat(form.amount),
      date: selectedDate
    };
    await fetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify(newExpense)
    });
    setForm({ title: "", amount: "", category: "Food", note: "" });
    setOpen(false);
    fetch("/api/expenses").then((res) => res.json()).then(setExpenses);
  };

  return (
    <div className="flex flex-col items-center">
      <Calendar
        onClickDay={(date) => {
          setSelectedDate(date);
          setOpen(true);
        }}
        value={selectedDate}
        tileContent={({ date }) => {
  if (!Array.isArray(expenses)) return null;
  const dayExpenses = expenses.filter(
    (exp) => new Date(exp.date).toDateString() === date.toDateString()
  );
  return dayExpenses.length > 0 ? (
    <div className="text-xs text-red-600">
      ₹{dayExpenses.reduce((sum, e) => sum + e.amount, 0)}
    </div>
  ) : null;
}}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense - {selectedDate.toDateString()}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="Amount"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Select
            onValueChange={(val) => setForm({ ...form, category: val })}
            value={form.category}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Food">Food</SelectItem>
              <SelectItem value="Travel">Travel</SelectItem>
              <SelectItem value="Bills">Bills</SelectItem>
              <SelectItem value="Shopping">Shopping</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Note (optional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <Button onClick={handleAddExpense}>Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
