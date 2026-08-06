import { BadgeIndianRupee, Info } from "lucide-react";
import { LegalPage } from "@/components/customer/LegalPage";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy" icon={BadgeIndianRupee}>
      <Alert variant="info">
        <Info />
        <AlertDescription>
          Customer satisfaction is our highest priority at{" "}
          <strong>Pala Pitta Ruchulu</strong>. If you experience any issue with
          your order, please contact our support team immediately at{" "}
          <strong>+91 70326 82089</strong>.
        </AlertDescription>
      </Alert>

      <section>
        <h2>1. Order Cancellation Policy</h2>
        <ul>
          <li>
            <strong>Before Kitchen Preparation:</strong> You may cancel your
            order free of charge within <strong>2 minutes</strong> of placing
            it, or before the kitchen begins cooking. A 100% refund will be
            issued.
          </li>
          <li>
            <strong>After Kitchen Preparation Begins:</strong> Once our chefs
            start preparing your items, cancellations are not permitted as food
            cannot be reused.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h2>2. Refund Eligibility & Scenarios</h2>
        <p>
          Full or partial refunds / replacements are granted under the following
          circumstances:
        </p>
        <ul>
          <li>
            <strong>Damaged / Spilled Food:</strong> If food containers arrive
            damaged or severely spilled during transit.
          </li>
          <li>
            <strong>Missing Items:</strong> If any item ordered is missing from
            your delivery package.
          </li>
          <li>
            <strong>Incorrect Order Delivered:</strong> If a wrong dish was
            delivered to your address.
          </li>
          <li>
            <strong>Quality / Freshness Defect:</strong> If the food is verified
            to be undercooked or defective upon delivery.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h2>3. Non-Refundable Scenarios</h2>
        <ul>
          <li>
            Incorrect delivery address or mobile phone number provided by the
            customer.
          </li>
          <li>
            Customer unavailable to receive delivery after driver arrival.
          </li>
          <li>Change of personal preference after food has been prepared.</li>
        </ul>
      </section>

      <Separator />

      <section>
        <h2>4. Refund Processing Timelines</h2>
        <p>
          Approved refunds are processed back to your original payment method:
        </p>
        <ul>
          <li>
            <strong>UPI / Credit / Debit Cards / Net Banking:</strong> Refunded
            within <strong>3–5 business days</strong> depending on your bank.
          </li>
          <li>
            <strong>Counter payments (cash at the restaurant):</strong> Eligible
            refunds are returned as cash at the counter, or credited via UPI
            transfer or an instant store voucher if you have already left.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h2>5. How to Request a Refund</h2>
        <p>
          Please contact us within <strong>2 hours of order delivery</strong>{" "}
          with your Order ID and photos of the food package (if damaged):
        </p>
        <section>
          <p>Pala Pitta Ruchulu Support Team</p>
          <p>📞 Order Hotline: +91 70326 82089</p>
          <p>💬 WhatsApp Support: +91 70326 82089</p>
          <p>✉️ Email: palapittaruchulu@gmail.com</p>
        </section>
      </section>
    </LegalPage>
  );
}
