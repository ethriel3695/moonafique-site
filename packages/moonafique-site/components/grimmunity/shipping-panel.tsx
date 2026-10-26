"use client";
import { useState } from "react";
import { ClubAction, TrackingForm } from "./actions";
import { money } from "@/lib/grimmunity/model";
import { Input } from "@/components/ui/input";
import type { ShippingLabel } from "@/lib/grimmunity/shipping";

export function ShippingPanel({
  id,
  label,
  fixture = false,
}: {
  id: string;
  label?: ShippingLabel | null;
  fixture?: boolean;
}) {
  const [selected, setSelected] = useState("");
  const rate = label?.rates.find((r) => r.id === selected) ?? label?.rates[0];
  if (label?.state === "purchased")
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold">
          {label.test ? "Test label ready" : "Postage purchased"} ·{" "}
          {money({ amount: label.amount!, currency: "usd" })}
        </p>
        <a
          href={label.label_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-bold underline"
          aria-disabled={fixture || undefined}
          onClick={fixture ? (event) => event.preventDefault() : undefined}
        >
          Download 4 × 6 label
        </a>
        <p className="text-xs leading-5">
          Print the label and dispatch the parcel, then mark it dispatched
          below. Buying postage does not mark the order shipped.
        </p>
        <TrackingForm
          id={id}
          fixture={fixture}
          tracking={{
            number: label.tracking_number!,
            url: label.tracking_url ?? "",
          }}
        />
      </div>
    );
  if (label && label.state !== "quoted")
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm font-bold">
          Label purchase needs review in Shippo. Check its outcome before
          purchasing any replacement.
        </p>
        {label.transaction_id && (
          <ClubAction
            endpoint="/api/grimmunity/shipping"
            fields={{ action: "refresh", id }}
            submitLabel="Check existing label"
            disabled={fixture}
          >
            <p className="text-xs">
              Retrieves the recorded transaction without buying postage.
            </p>
          </ClubAction>
        )}
        {!label.transaction_id && (
          <ClubAction
            endpoint="/api/grimmunity/shipping"
            fields={{ action: "refresh", id }}
            submitLabel="Recover existing Shippo label"
            disabled={fixture}
          >
            <label className="block text-sm">
              Shippo transaction ID
              <Input name="transactionId" required pattern="[a-f0-9]{32}" />
            </label>
            <p className="text-xs">
              Find the transaction tagged with this order in Shippo. The website
              verifies its order reference and selected rate before saving it.
            </p>
          </ClubAction>
        )}
      </div>
    );
  return (
    <div className="space-y-4">
      <ClubAction
        endpoint="/api/grimmunity/shipping"
        fields={{ action: "quote", id }}
        submitLabel={label ? "Refresh Shippo rates" : "Get Shippo rates"}
        disabled={fixture}
      >
        <p className="text-xs leading-5">
          Quotes the locked packing address. Grimm: 8 × 8 × 8 in, 8 oz. ACEO: 7
          × 5 × 1 in, 6 oz.
        </p>
      </ClubAction>
      {label && rate && (
        <>
          <label className="block text-sm font-semibold">
            Shipping service
            <select
              className="mt-2 block w-full rounded-xl border bg-background p-3"
              value={rate.id}
              onChange={(event) => setSelected(event.target.value)}
            >
              {label.rates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.carrier} {r.service} ·{" "}
                  {money({ amount: r.amount, currency: r.currency })}
                </option>
              ))}
            </select>
          </label>
          <ClubAction
            endpoint="/api/grimmunity/shipping"
            fields={{
              action: "buy",
              id,
              quoteId: label.quote_id,
              rateId: rate.id,
              maxAmount: rate.amount,
              confirmed: true,
            }}
            submitLabel={`${label.test ? "Create test label" : "Buy label"} · ${money({ amount: rate.amount, currency: rate.currency })}`}
            disabled={fixture}
          >
            <label className="flex items-start gap-2 text-xs leading-5">
              <input type="checkbox" required className="mt-1" />
              {label.test
                ? "Create a sample label without buying real postage."
                : `Purchase this ${rate.carrier} label for ${money({ amount: rate.amount, currency: rate.currency })}.`}
            </label>
          </ClubAction>
        </>
      )}
      <details>
        <summary className="cursor-pointer text-xs font-semibold">
          Enter tracking for postage purchased elsewhere
        </summary>
        <div className="mt-3">
          <TrackingForm id={id} fixture={fixture} />
        </div>
      </details>
    </div>
  );
}
