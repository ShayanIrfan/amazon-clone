import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ImageOff, Plus, Trash2 } from "lucide-react";
import type { AdminProduct, AdminProductInput, Product } from "../../lib/types";
import ProductCard from "../product/ProductCard";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import Select from "../ui/Select";
import TextField from "../ui/TextField";

const NEW_DEPARTMENT = "__new";
const MAX_IMAGES = 10;
const NO_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#f4f6f5"/><path d="M30 84l20-24 14 16 10-12 16 20z" fill="#d7dedc"/><circle cx="46" cy="42" r="8" fill="#d7dedc"/></svg>',
  );

interface Values {
  title: string;
  brand: string;
  description: string;
  department: string;
  newDepartment: string;
  price: string;
  discount: string;
  stock: string;
  sku: string;
  tags: string;
  minQty: string;
  warranty: string;
  shipping: string;
  returns: string;
  images: string[];
}

type Errors = Partial<Record<keyof Values | "images", string>>;

function initialValues(product?: AdminProduct): Values {
  return {
    title: product?.title ?? "",
    brand: product?.brand ?? "",
    description: product?.description ?? "",
    department: product?.category ?? "",
    newDepartment: "",
    price: product ? String(product.price) : "",
    discount: product ? String(product.discountPercentage ?? 0) : "",
    stock: product ? String(product.stock) : "",
    sku: product?.sku ?? "",
    tags: product?.tags.join(", ") ?? "",
    minQty: product ? String(product.minimumOrderQuantity ?? 1) : "",
    warranty: product?.warrantyInformation ?? "",
    shipping: product?.shippingInformation ?? "",
    returns: product?.returnPolicy ?? "",
    images: product?.images.length ? [...product.images] : [""],
  };
}

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const parseTags = (raw: string) => [...new Set(raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];

/** Mirrors the server's rules so mistakes are caught before a round trip. The server still re-checks everything. */
function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.title.trim()) errors.title = "Enter a title";
  else if (v.title.trim().length > 200) errors.title = "Use 200 characters or fewer";
  if (!v.description.trim()) errors.description = "Enter a description";
  else if (v.description.trim().length > 5000) errors.description = "Use 5,000 characters or fewer";
  if (v.department === NEW_DEPARTMENT ? !v.newDepartment.trim() : !v.department) errors.department = "Choose a department";

  const price = Number(v.price);
  if (v.price.trim() === "" || Number.isNaN(price)) errors.price = "Enter a price";
  else if (price < 0.01) errors.price = "Price must be at least $0.01";
  else if (price > 100_000) errors.price = "Price can't exceed $100,000";

  if (v.discount.trim() !== "") {
    const discount = Number(v.discount);
    if (Number.isNaN(discount) || discount < 0 || discount > 90) errors.discount = "Enter a discount from 0 to 90";
  }

  const stock = Number(v.stock);
  if (v.stock.trim() === "" || Number.isNaN(stock)) errors.stock = "Enter a stock quantity";
  else if (!Number.isInteger(stock)) errors.stock = "Stock must be a whole number";
  else if (stock < 0 || stock > 100_000) errors.stock = "Enter 0 to 100,000";

  if (v.minQty.trim() !== "") {
    const min = Number(v.minQty);
    if (!Number.isInteger(min) || min < 1 || min > 99) errors.minQty = "Enter a whole number from 1 to 99";
  }

  const images = v.images.map((i) => i.trim()).filter(Boolean);
  if (images.length === 0) errors.images = "Add at least one image URL";
  else if (images.some((i) => !isHttpUrl(i))) errors.images = "Each image must be a valid http(s) URL";

  const tags = parseTags(v.tags);
  if (tags.length > 20) errors.tags = "Use at most 20 tags";
  else if (tags.some((t) => t.length > 30)) errors.tags = "Keep each tag under 30 characters";
  return errors;
}

function toInput(v: Values): AdminProductInput {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    category: v.department === NEW_DEPARTMENT ? v.newDepartment.trim() : v.department,
    brand: v.brand.trim(),
    price: Number(v.price),
    discountPercentage: v.discount.trim() === "" ? 0 : Number(v.discount),
    stock: Number(v.stock),
    sku: v.sku.trim(),
    tags: parseTags(v.tags),
    minimumOrderQuantity: v.minQty.trim() === "" ? 1 : Number(v.minQty),
    warrantyInformation: v.warranty.trim(),
    shippingInformation: v.shipping.trim(),
    returnPolicy: v.returns.trim(),
    images: v.images.map((i) => i.trim()).filter(Boolean),
  };
}

interface Props {
  product?: AdminProduct;
  departments: { slug: string; name: string }[];
  busy: boolean;
  /** A server-side failure to show above the save button (e.g. an edit conflict). */
  error: string | null;
  submitLabel: string;
  onSubmit: (input: AdminProductInput) => void;
  /** Extra cards under the save panel: status, activity, danger zone. */
  aside?: ReactNode;
}

export default function ProductForm({ product, departments, busy, error, submitLabel, onSubmit, aside }: Props) {
  const [values, setValues] = useState<Values>(() => initialValues(product));
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = submitted ? validate(values) : {};

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const setImage = (index: number, value: string) => set("images", values.images.map((img, i) => (i === index ? value : img)));

  const options = useMemo(() => {
    const known = new Map(departments.map((d) => [d.slug, d.name]));
    if (product && !known.has(product.category)) known.set(product.category, product.category.replace(/-/g, " "));
    return [...known.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [departments, product]);

  const firstImage = values.images.map((i) => i.trim()).find(isHttpUrl);
  const preview: Product = {
    _id: "preview",
    sourceId: 0,
    title: values.title.trim() || "Product title",
    description: "",
    category: values.department,
    price: Number(values.price) || 0,
    discountPercentage: Number(values.discount) || 0,
    rating: product?.rating ?? 0,
    ratingCount: product?.ratingCount ?? 0,
    stock: Number(values.stock) || 0,
    tags: [],
    brand: values.brand,
    sku: "",
    images: [],
    thumbnail: firstImage ?? NO_IMAGE,
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(values);
    if (Object.keys(found).length) {
      // Wait a tick for the error messages (and aria-invalid) to render, then jump to the first one.
      setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    onSubmit(toInput(values));
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <Panel className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-ink">Basic details</h2>
          <TextField label="Title" value={values.title} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={220} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Brand" value={values.brand} onChange={(e) => set("brand", e.target.value)} hint="Optional" />
            <div>
              <Select
                label="Department"
                value={values.department}
                onChange={(e) => set("department", e.target.value)}
                aria-invalid={!!errors.department || undefined}
                className={errors.department ? "border-clay" : ""}
              >
                <option value="">Choose…</option>
                {options.map(([slug, name]) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
                <option value={NEW_DEPARTMENT}>New department…</option>
              </Select>
              {errors.department && values.department !== NEW_DEPARTMENT && <p className="mt-1 text-sm text-clay">{errors.department}</p>}
            </div>
          </div>
          {values.department === NEW_DEPARTMENT && (
            <TextField
              label="New department name"
              value={values.newDepartment}
              onChange={(e) => set("newDepartment", e.target.value)}
              error={errors.department}
              hint="Shoppers see it in the store as soon as this product is saved."
            />
          )}
          <div>
            <label htmlFor="product-description" className="mb-1 block text-sm font-medium text-ink">
              Description
            </label>
            <textarea
              id="product-description"
              rows={5}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              aria-invalid={!!errors.description || undefined}
              className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none ${errors.description ? "border-clay" : "border-line-strong focus:border-harbor"}`}
            />
            {errors.description ? <p className="mt-1 text-sm text-clay">{errors.description}</p> : <p className="mt-1 text-sm text-slate">Each sentence becomes a bullet on the product page.</p>}
          </div>
          <TextField label="Tags" value={values.tags} onChange={(e) => set("tags", e.target.value)} error={errors.tags} hint="Comma separated, used by search" />
        </Panel>

        <Panel className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-ink">Pricing and stock</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Price (USD)" type="number" inputMode="decimal" step="0.01" min="0" value={values.price} onChange={(e) => set("price", e.target.value)} error={errors.price} />
            <TextField label="Discount %" type="number" inputMode="decimal" step="0.1" min="0" max="90" value={values.discount} onChange={(e) => set("discount", e.target.value)} error={errors.discount} hint="Optional, 0 to 90" />
            <TextField label="Stock" type="number" inputMode="numeric" step="1" min="0" value={values.stock} onChange={(e) => set("stock", e.target.value)} error={errors.stock} />
            <TextField label="Minimum order quantity" type="number" inputMode="numeric" step="1" min="1" value={values.minQty} onChange={(e) => set("minQty", e.target.value)} error={errors.minQty} hint="Optional, defaults to 1" />
            <TextField label="SKU" value={values.sku} onChange={(e) => set("sku", e.target.value)} hint="Optional" containerClassName="sm:col-span-2" />
          </div>
        </Panel>

        <Panel className="space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold text-ink">Images</h2>
            <p className="text-sm text-slate">Paste image URLs. The first one is the main image shown on cards.</p>
          </div>
          <ul className="space-y-3">
            {values.images.map((url, index) => {
              const valid = isHttpUrl(url.trim());
              return (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white" aria-hidden>
                    {valid ? <img src={url.trim()} alt="" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.visibility = "hidden")} /> : <ImageOff size={16} className="text-line-strong" />}
                  </span>
                  <TextField
                    aria-label={index === 0 ? "Main image URL" : `Image ${index + 1} URL`}
                    placeholder="https://…"
                    value={url}
                    onChange={(e) => setImage(index, e.target.value)}
                    aria-invalid={(submitted && !!errors.images && !valid) || undefined}
                    containerClassName="min-w-0 flex-1"
                  />
                  <Button
                    variant="quiet"
                    size="md"
                    aria-label={`Remove image ${index + 1}`}
                    disabled={values.images.length === 1}
                    onClick={() => set("images", values.images.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
          {errors.images && <p className="text-sm text-clay">{errors.images}</p>}
          <Button variant="secondary" size="sm" disabled={values.images.length >= MAX_IMAGES} onClick={() => set("images", [...values.images, ""])}>
            <Plus size={14} aria-hidden /> Add image
          </Button>
        </Panel>

        <Panel className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-ink">Policies</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Warranty" value={values.warranty} onChange={(e) => set("warranty", e.target.value)} hint="Optional" />
            <TextField label="Shipping" value={values.shipping} onChange={(e) => set("shipping", e.target.value)} hint="Optional" />
            <TextField label="Returns" value={values.returns} onChange={(e) => set("returns", e.target.value)} hint="Optional" />
          </div>
        </Panel>
      </div>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Panel className="space-y-4 p-4">
          <h2 className="text-lg font-semibold text-ink">Save</h2>
          {submitted && Object.keys(errors).length > 0 && (
            <p role="alert" className="text-sm font-medium text-clay">
              Fix the highlighted fields to continue.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-md border border-clay/30 bg-clay/5 p-3 text-sm font-medium text-clay">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {submitLabel}
          </Button>
        </Panel>

        <Panel className="p-4">
          <h2 className="mb-2 text-lg font-semibold text-ink">Storefront preview</h2>
          {/* inert: it's a picture of the card, not a working link. */}
          <div inert className="mx-auto w-48 select-none">
            <ProductCard product={preview} />
          </div>
        </Panel>

        {aside}
      </div>
    </form>
  );
}
