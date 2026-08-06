import { Scale } from "lucide-react";
import { LegalPage } from "@/components/customer/LegalPage";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" icon={Scale}>
      <section>
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or placing an order through the{" "}
          <strong>Pala Pitta Ruchulu</strong> website, mobile app, or dining at
          our Madhapur, Hyderabad outlet, you agree to comply with and be bound
          by these Terms & Conditions. If you do not agree, please refrain from
          using our services.
        </p>
      </section>

      <Separator />

      <section>
        <h2>2. Food Preparation & Allergen Disclaimer</h2>
        <p>
          At Pala Pitta Ruchulu, we prepare authentic Telangana, Andhra, and
          Hyderabadi dishes using traditional clay tandoors and brass handis:
        </p>
        <ul>
          <li>
            <strong>Veg & Non-Veg Integrity:</strong> We maintain strict
            separate cooking vessels and utensils for vegetarian items (🟢) and
            non-vegetarian items (🔴).
          </li>
          <li>
            <strong>Spice Levels:</strong> Dish spice levels range from Mild to
            Hot. Customers should specify spice preferences when ordering.
          </li>
          <li>
            <strong>Allergens:</strong> Our dishes may contain whole spices,
            tree nuts, dairy (pure cow ghee, curd, paneer), or sesame. Customers
            with severe food allergies must inform the kitchen before ordering.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h2>3. Pricing, Taxes & Discounts</h2>
        <p>All food menu prices are listed in Indian Rupees (₹):</p>
        <ul>
          <li>
            <strong>GST Applicable:</strong> Statutory Central GST (CGST 2.5%)
            and State GST (SGST 2.5%) are calculated on the item subtotal in
            accordance with Indian tax laws.
          </li>
          <li>
            <strong>Coupons & Offers:</strong> Promotional discounts (e.g.{" "}
            <code>PALAPITTA10</code>) are valid only when minimum order
            conditions are met and cannot be combined with other offline offers.
          </li>
          <li>
            <strong>Delivery Charges:</strong> Delivery fees apply based on
            distance and order total as indicated during checkout.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h2>4. Online Delivery & Guest Orders</h2>
        <p>
          Estimated delivery times (typically 30–45 minutes in Madhapur and
          surrounding areas) are subject to weather, traffic, and kitchen peak
          hours. Customers are responsible for providing an accurate 10-digit
          mobile number and full delivery address.
        </p>
      </section>

      <Separator />

      <section>
        <h2>5. Table Reservations</h2>
        <p>
          Reserved tables will be held for up to <strong>15 minutes</strong>{" "}
          past the reserved time. If guests do not arrive within the grace
          period, the table may be released to waiting walk-in diners.
        </p>
      </section>

      <Separator />

      <section>
        <h2>6. Governing Law</h2>
        <p>
          These terms are governed by the laws of Telangana, India. Any disputes
          arising out of restaurant transactions or services shall be subject to
          the exclusive jurisdiction of the courts in Hyderabad.
        </p>
      </section>
    </LegalPage>
  );
}
