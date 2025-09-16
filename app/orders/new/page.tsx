"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useRole } from "@/hooks/use-role";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewOrderPage() {
  const { session, isLoading, isReseller } = useRole();
  const categories = useQuery(api.orders.listActiveCategories, {});
  const createOrder = useMutation(api.orders.createOrder);

  const teamId = session?.resellerMember?.teamId as string | undefined;

  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [cartValueUsd, setCartValueUsd] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [sla, setSla] = useState<"asap" | "today" | "24h">("asap");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!isReseller) return <div className="p-4">Not authorized</div>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!teamId) {
      setMsg("No team found in session");
      return;
    }
    if (!categoryId) {
      setMsg("Select a category");
      return;
    }
    try {
      setSubmitting(true);
      const value = parseFloat(cartValueUsd);
      await createOrder({
        teamId: teamId as any,
        categoryId: categoryId as any,
        cartValueUsd: isNaN(value) ? 0 : value,
        merchant,
        customerName,
        country,
        city,
        contact: contact || undefined,
        sla,
        attachmentFileIds: [],
        pickupAddress: undefined,
        deliveryAddress: undefined,
        timeWindow: undefined,
        itemsSummary: undefined,
        currencyOverride: undefined,
      });
      setMsg("Order created");
      // Reset form fields after successful creation
      setCategoryId(undefined);
      setCartValueUsd("");
      setMerchant("");
      setCustomerName("");
      setCountry("");
      setCity("");
      setContact("");
      setSla("asap");
    } catch (e: any) {
      setMsg(e?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Create Order</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cart Value (USD)</Label>
                <Input value={cartValueUsd} onChange={(e) => setCartValueUsd(e.target.value)} placeholder="e.g. 120" />
              </div>
              <div>
                <Label>Merchant</Label>
                <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Chipotle" />
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. US" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. NYC" />
              </div>
              <div>
                <Label>Contact</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email or phone (optional)" />
              </div>
              <div>
                <Label>SLA</Label>
                <Select value={sla} onValueChange={(v: any) => setSla(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asap">ASAP</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="24h">24h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create Order"}</Button>
              </div>
              {msg && <div className="md:col-span-2 text-sm text-muted-foreground">{msg}</div>}
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


