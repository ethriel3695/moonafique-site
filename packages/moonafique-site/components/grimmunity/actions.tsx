"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, type Address } from "@/lib/grimmunity/model";
import { membershipPage } from "@/lib/grimmunity/collections";
import {
  monthlyAmount,
  publicTierCopy,
  shippingLabel,
  tierLabels,
  type Tier,
  type TierAvailability,
  type TierId,
} from "@/lib/grimmunity/tiers";
import { useRouter } from "next/navigation";
import { AvailabilityBadge, useMembershipAvailability } from "./availability";

export function ClubAction({
  endpoint,
  children,
  fields = {},
  disabled = false,
  submitLabel,
}: {
  endpoint: string;
  children: React.ReactNode;
  fields?: Record<string, unknown>;
  disabled?: boolean;
  submitLabel?: string;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending || disabled) return;
        setPending(true);
        setError("");
        const data = new FormData(event.currentTarget);
        const body = { ...fields, ...Object.fromEntries(data.entries()) };
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error ?? "Please try again.");
          if (result.url) window.location.assign(result.url);
          else router.refresh();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Please try again.",
          );
        } finally {
          setPending(false);
        }
      }}
      className="space-y-3"
    >
      {children}
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
      <Button disabled={pending || disabled} type="submit">
        {pending
          ? "Working…"
          : (submitLabel ??
            (fields.action === "unlock"
              ? "Unlock address for correction"
              : fields.action === "reconsider"
                ? "Re-evaluate paid invoice"
                : fields.action === "lock"
                  ? "Lock for packing"
                  : fields.action === "ship"
                    ? "Save tracking"
                    : fields.action === "resolve"
                      ? "Save review note"
                      : fields.action === "release"
                        ? "Recheck and release hold"
                        : fields.action === "state"
                          ? "Update edition status"
                          : fields.action === "edition"
                            ? "Save edition"
                            : "Open billing & delivery"))}
      </Button>
    </form>
  );
}
export type JoinFormFixtureState = {
  tierId?: TierId;
  quote?: {
    id: string;
    rate: { amount: number; carrier: string; service: string };
    monthlyTotal: number;
  };
  quoting?: boolean;
  error?: string;
  preferredColors?: string[];
  avoidedColors?: string;
  address?: Address;
};

export function JoinForm({
  termsVersion,
  countries,
  sandbox = false,
  tiers,
  currency,
  taxAdded = false,
  fixture = false,
  children,
  availability: initialAvailability = {},
  fixtureState,
}: {
  children?: React.ReactNode;
  tiers: Tier[];
  currency: string;
  taxAdded?: boolean;
  fixture?: boolean;
  termsVersion: string;
  countries: string[];
  sandbox?: boolean;
  availability?: TierAvailability;
  /** Presentation data is used only when fixture=true. Never authorizes checkout. */
  fixtureState?: JoinFormFixtureState;
}) {
  const availability = useMembershipAvailability(initialAvailability);
  const displayedTiers = tiers.map(publicTierCopy);
  const example = fixture ? fixtureState : undefined;
  const [selected, setSelected] = useState(
    example?.tierId && tiers.some((t) => t.id === example.tierId)
      ? example.tierId
      : (tiers.find((t) => !availability[t.id]?.full)?.id ?? tiers[0].id),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [quote, setQuote] = useState<{
    id: string;
    rate: { amount: number; carrier: string; service: string };
    monthlyTotal: number;
  } | null>(example?.quote ?? null);
  const [quoting, setQuoting] = useState(example?.quoting ?? false);
  const [consent, setConsent] = useState(false);
  const tier = tiers.find((t) => t.id === selected)!;
  const full =
    !!availability[tier.id]?.full || availability[tier.id]?.remaining === 0;
  const dynamicShipping = tier.shipping_mode === "shippo";
  const total = dynamicShipping
    ? (quote?.monthlyTotal ?? null)
    : monthlyAmount(tier);
  const shippingPending = total === null;
  const key = useRef<string | undefined>(undefined);
  const [pending, setPending] = useState(false),
    [error, setError] = useState(example?.error ?? "");
  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending || fixture || shippingPending || full) return;
        setPending(true);
        setError("");
        key.current ??= crypto.randomUUID();
        const form = new FormData(event.currentTarget);
        try {
          const response = await fetch("/api/grimmunity/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestKey: key.current,
              tierId: tier.id,
              ...(dynamicShipping && quote
                ? { shippingQuoteId: quote.id }
                : {}),
              ...(tier.id === "grimm_starter"
                ? {
                    preferences: {
                      preferred_colors: Array.from({ length: 6 }, (_, n) =>
                        String(form.get(`color_${n}`) ?? "").trim(),
                      ),
                      avoided_colors: String(form.get("avoided_colors") ?? "")
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean),
                    },
                  }
                : {}),
              termsVersion,
              country: form.get("country"),
              consent: form.get("consent") === "on",
            }),
          });
          const result = await response.json();
          if (response.status === 401) {
            window.location.assign(`/sign-in?returnTo=${membershipPage(tier)}`);
            return;
          }
          if (!response.ok) throw new Error(result.error);
          window.location.assign(result.url);
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to open checkout. Please try again.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset disabled={pending || quoting} className="mb-8 min-w-0">
        <legend className="mb-4 text-sm font-bold">
          {tiers.length === 1
            ? "Your monthly membership"
            : "Choose your membership"}
        </legend>
        <div
          className={`grid gap-4 ${tiers.length === 1 ? "max-w-3xl" : "md:grid-cols-2"}`}
        >
          {displayedTiers.map((t) => (
            <label
              key={t.id}
              className={`flex cursor-pointer flex-col rounded-3xl border-2 p-6 ${selected === t.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <span className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-primary">
                {tiers.length === 1 ? "Monthly membership" : tierLabels[t.id]}
                <input
                  type="radio"
                  aria-label={t.name}
                  name="tier"
                  value={t.id}
                  checked={selected === t.id}
                  disabled={availability[t.id]?.full}
                  onChange={() => {
                    setSelected(t.id);
                    setQuote(null);
                    setConsent(false);
                    key.current = undefined;
                    setError("");
                  }}
                  className="size-5 accent-primary"
                />
              </span>
              <span className="text-2xl font-bold">{t.name}</span>
              <span className="mt-3">
                <AvailabilityBadge tier={t} availability={availability} />
              </span>
              <span className="mt-3 text-sm leading-6">{t.description}</span>
              <span className="my-5 text-3xl font-bold">
                {money({ amount: t.amount, currency })}
                <span className="text-sm font-normal"> / month</span>
              </span>
              <span className="text-sm font-semibold text-primary">
                {shippingLabel(t, currency)}
              </span>
              {t.perks.map((perk) => (
                <span key={perk} className="mt-3 text-sm leading-6">
                  {perk}
                </span>
              ))}
              {!t.benefits_confirmed && (
                <span className="mt-4 text-xs leading-5 text-muted-foreground">
                  {t.id === "entry"
                    ? "Base membership for review."
                    : "Additional perks are still being decided."}{" "}
                  Test price only.
                </span>
              )}
            </label>
          ))}
        </div>
      </fieldset>
      {tier.id === "grimm_starter" && (
        <fieldset disabled={pending} className="rounded-3xl border bg-card p-6">
          <legend className="px-2 text-lg font-bold">
            Make the mystery a little more you
          </legend>
          <p className="mb-4 text-sm leading-6">
            Pick six colors you love and tell us any you’d rather skip. We’ll
            take it from there—the monthly design is part of the surprise.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, n) => (
              <label key={n} className="text-sm font-semibold">
                Preferred color {n + 1}
                <Input
                  name={`color_${n}`}
                  required
                  maxLength={40}
                  list="grimm-colors"
                  defaultValue={example?.preferredColors?.[n]}
                />
              </label>
            ))}
          </div>
          <datalist id="grimm-colors">
            {[
              "Red",
              "Orange",
              "Yellow",
              "Green",
              "Blue",
              "Purple",
              "Pink",
              "Black",
              "White",
              "Gray",
              "Teal",
              "Brown",
            ].map((color) => (
              <option key={color} value={color} />
            ))}
          </datalist>
          <label className="mt-4 block text-sm font-semibold">
            Colors to avoid (optional, separated by commas)
            <Input
              name="avoided_colors"
              maxLength={800}
              defaultValue={example?.avoidedColors}
            />
          </label>
        </fieldset>
      )}
      {dynamicShipping && (
        <fieldset
          disabled={pending || quoting}
          className="rounded-3xl border bg-card p-6"
          onChange={() => {
            setQuote(null);
            setConsent(false);
            key.current = undefined;
          }}
        >
          <legend className="px-2 text-lg font-bold">
            Delivery address & shipping
          </legend>
          <p className="mb-4 text-sm leading-6">
            Shipping is quoted through Shippo for your address. The shipping
            amount you accept renews monthly with this subscription. Address
            changes may need a new shipping review.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["name", "Full name"],
              ["line1", "Street address"],
              ["line2", "Apartment or suite (optional)"],
              ["city", "City"],
              ["state", "State (two letters)"],
              ["postal_code", "ZIP code"],
            ].map(([name, label]) => (
              <label key={name} className="text-sm font-semibold">
                {label}
                <Input
                  name={name}
                  required={name !== "line2"}
                  maxLength={name === "state" ? 2 : 150}
                  defaultValue={example?.address?.[name as keyof Address]}
                  autoComplete={
                    name === "postal_code" ? "postal-code" : undefined
                  }
                />
              </label>
            ))}
          </div>
          <p className="my-3 text-xs">
            U.S. delivery. Each subscription has its own shipment and shipping
            charge.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={pending || quoting || fixture || full}
            onClick={async () => {
              if (!formRef.current) return;
              setQuoting(true);
              setError("");
              setQuote(null);
              setConsent(false);
              key.current = undefined;
              const form = new FormData(formRef.current);
              try {
                const response = await fetch("/api/grimmunity/shipping-quote", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    tierId: tier.id,
                    address: Object.fromEntries(
                      ["name", "line1", "line2", "city", "state", "postal_code"]
                        .map((name) => [
                          name,
                          String(form.get(name) ?? "").trim(),
                        ])
                        .concat([["country", "US"]]),
                    ),
                  }),
                });
                const result = await response.json();
                if (response.status === 401) {
                  window.location.assign(
                    `/sign-in?returnTo=${membershipPage(tier)}`,
                  );
                  return;
                }
                if (!response.ok) throw new Error(result.error);
                setQuote(result);
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Unable to calculate shipping.",
                );
              } finally {
                setQuoting(false);
              }
            }}
          >
            {quoting
              ? "Getting shipping quote…"
              : quote
                ? "Refresh shipping quote"
                : "Calculate shipping"}
          </Button>
          {quote && (
            <p className="mt-4 font-semibold" role="status">
              {money({ amount: quote.rate.amount, currency })} shipping each
              month. Monthly subtotal:{" "}
              {money({ amount: quote.monthlyTotal, currency })}
              {taxAdded ? " plus applicable sales tax" : ""}.
            </p>
          )}
        </fieldset>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {children && (
          <div className="rounded-3xl border bg-card p-6">{children}</div>
        )}
        <div className="min-w-0 space-y-4 rounded-3xl border bg-card p-6">
          <p aria-live="polite" className="font-bold">
            {tier.name} · {money({ amount: tier.amount, currency })} / month
            {tier.shipping !== undefined && " + shipping"}
          </p>
          <p className="text-sm">
            {quote
              ? `${money({ amount: quote.rate.amount, currency })} shipping per month · ${quote.rate.carrier} ${quote.rate.service}`
              : shippingLabel(tier, currency)}
          </p>
          {total !== null && (
            <p className="text-sm font-bold">
              Monthly {taxAdded ? "subtotal" : "total"}:{" "}
              {money({ amount: total, currency })}
              {taxAdded && " plus applicable sales tax"}
            </p>
          )}
          <label className="block text-sm font-bold">
            Delivery country
            <select
              required
              name="country"
              className="mt-2 block w-full rounded-xl border bg-background p-3"
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {new Intl.DisplayNames(["en"], { type: "region" }).of(c) ?? c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              required
              name="consent"
              disabled={shippingPending}
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              type="checkbox"
              className="mt-1.5 size-4 accent-primary"
            />
            <span>
              {total === null
                ? "The full monthly total will be available once the shipping fee is set. Checkout is closed."
                : `I agree to ${money({ amount: total, currency })}${taxAdded ? " plus applicable sales tax" : ""} per month for ${tier.name}${tier.shipping ? ", including the separately listed shipping fee" : ""}, starting today and renewing monthly until I cancel future renewals.`}
            </span>
          </label>
          <Button
            type="submit"
            disabled={pending || fixture || shippingPending || full}
            className="h-auto min-h-10 w-full whitespace-normal py-3"
          >
            {full
              ? tier.id === "grimm_keeper"
                ? "Vaulted for now"
                : "Sold out"
              : shippingPending
                ? dynamicShipping
                  ? "Calculate shipping to continue"
                  : "Shipping fee pending · checkout closed"
                : fixture
                  ? "Fixture preview · checkout disabled"
                  : pending
                    ? "Opening secure checkout…"
                    : sandbox
                      ? "Join in Stripe sandbox"
                      : `Join ${tier.name}`}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            Sign in to join. Pay securely with Stripe, then manage your
            membership in your account.
          </p>
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-800">
              {error}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
export function TrackingForm({
  id,
  tracking,
  fixture = false,
}: {
  id: string;
  tracking?: { number: string; url: string };
  fixture?: boolean;
}) {
  return (
    <div className="space-y-5">
      <ClubAction
        endpoint="/api/grimmunity/admin"
        fields={{ action: "ship", id }}
        submitLabel="Mark dispatched"
        disabled={fixture}
      >
        <label className="block text-sm font-semibold">
          Tracking number
          <Input
            name="number"
            required
            maxLength={150}
            defaultValue={tracking?.number}
            readOnly={!!tracking}
          />
        </label>
        <label className="block text-sm font-semibold">
          Tracking link (optional)
          <Input
            name="url"
            type="url"
            placeholder="https://…"
            defaultValue={tracking?.url}
            readOnly={!!tracking}
          />
        </label>
      </ClubAction>
      <details>
        <summary className="cursor-pointer text-sm font-bold">
          Correct the packing address
        </summary>
        <ClubAction
          endpoint="/api/grimmunity/admin"
          fields={{ action: "unlock", id }}
          disabled={fixture}
        >
          <label className="block text-sm">
            Reason
            <textarea
              name="note"
              required
              minLength={8}
              maxLength={1000}
              className="mt-2 block w-full rounded-xl border p-3"
            />
          </label>
          <p className="text-xs">
            Update delivery details in Stripe, unlock, and lock again to use the
            corrected address. The previous snapshot remains in the audit
            history.
          </p>
        </ClubAction>
      </details>
    </div>
  );
}
export function EditionForm() {
  return (
    <ClubAction
      endpoint="/api/grimmunity/editions"
      fields={{ action: "edition" }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Edition month
          <Input type="month" name="month" required />
        </label>
        <label>
          Subscriber design name
          <Input name="title" required maxLength={120} />
        </label>
        {(
          [
            "enrollment_open",
            "enrollment_close",
            "payment_cutoff",
            "address_cutoff",
            "dispatch_start",
            "dispatch_end",
          ] as const
        ).map((name) => (
          <label key={name} className="text-sm capitalize">
            {name.replaceAll("_", " ")}
            <Input name={name} type="datetime-local" required />
          </label>
        ))}
        <label>
          Availability
          <select
            name="state"
            className="block w-full rounded-xl border bg-background p-3"
          >
            <option value="draft">Draft</option>
            <option value="open">Open during enrollment window</option>
            <option value="closed">Closed</option>
            <option value="vaulted">Vaulted</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-muted-foreground">
        All times are America/Boise. Closing times are exclusive. Capacity and
        retained copies use the approved program configuration. Schedules cannot
        change after a checkout or payment references the edition.
      </p>
    </ClubAction>
  );
}
