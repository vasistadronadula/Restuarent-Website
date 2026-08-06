import { ShieldCheck } from "lucide-react";
import { LegalPage } from "@/components/customer/LegalPage";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" icon={ShieldCheck}>
      <section>
        <h2>1. Introduction</h2>
        <p>
          Welcome to <strong>Pala Pitta Ruchulu</strong> (&quot;we&quot;,
          &quot;our&quot;, &quot;us&quot;). We value your trust and are
          committed to protecting your personal information and privacy. This
          Privacy Policy outlines how we collect, use, store, and safeguard your
          details when you visit our website, place online food delivery orders,
          or book table reservations at our Madhapur, Hyderabad restaurant.
        </p>
      </section>

      <Separator />

      <section>
        <h2>2. Information We Collect</h2>
        <p>
          We collect information necessary to fulfill your food orders and
          provide seamless restaurant dining services:
        </p>
        <ul>
          <li>
            <strong>Contact Details:</strong> Full Name, Mobile Phone Number,
            Email Address, and Delivery Address.
          </li>
          <li>
            <strong>Order Information:</strong> Dishes selected, special cooking
            instructions, cart items, transaction history, and coupon codes
            applied.
          </li>
          <li>
            <strong>Table Reservations:</strong> Number of guests, date,
            preferred time slot, and special dietary/seating preferences.
          </li>
          <li>
            <strong>Technical Data:</strong> Device IP address, browser type,
            cookies, and local storage tokens used for maintaining your cart and
            login session.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h2>3. How We Use Your Information</h2>
        <p>
          Your personal data is strictly used for legitimate restaurant business
          operations:
        </p>
        <ul>
          <li>
            Processing and dispatching online food delivery and takeaway orders.
          </li>
          <li>
            Sending real-time order status and delivery tracking updates via
            WhatsApp / SMS.
          </li>
          <li>Confirming and managing table reservations.</li>
          <li>
            Providing customer support regarding refunds, feedback, or kitchen
            queries.
          </li>
          <li>
            Applying promotional discounts (such as <code>PALAPITTA10</code>)
            and loyalty rewards.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h2>4. Guest Ordering & Account Security</h2>
        <p>
          We support <strong>Guest Checkout</strong> so you can place orders
          without creating a permanent account. For registered users, account
          credentials and authentication sessions are securely handled via
          Supabase Auth with industry-standard SSL encryption. We{" "}
          <strong>never sell or rent</strong> your personal information to
          third-party advertisers.
        </p>
      </section>

      <Separator />

      <section>
        <h2>5. Payment Security</h2>
        <p>
          All online payment transactions (UPI, Credit/Debit Cards, NetBanking)
          are processed through secure PCI-DSS compliant payment gateways. Pala
          Pitta Ruchulu does not store card CVVs or bank PINs on our servers.
        </p>
      </section>

      <Separator />

      <section>
        <h2>6. Contact & Legal Compliance</h2>
        <p>
          For any privacy questions or requests regarding your data, please
          reach out to our management team:
        </p>
        <section>
          <p>Pala Pitta Ruchulu (Royal Spice)</p>
          <p>📍 Location: Madhapur, Hyderabad, Telangana – 500081</p>
          <p>
            📞 Phone: +91 70326 82089 | ✉️ Email: palapittaruchulu@gmail.com
          </p>
          <p>📜 GSTIN: 36AAACR1234F1Z5 | FSSAI License No: 10020011003457</p>
        </section>
      </section>
    </LegalPage>
  );
}
