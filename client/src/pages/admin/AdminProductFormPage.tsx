import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArchiveRestore, Archive, ChevronLeft, ExternalLink, Trash2 } from "lucide-react";
import { useCategories } from "../../hooks/useProducts";
import { useAdminActivity, useAdminProduct, useAdminProductMutations } from "../../hooks/useAdmin";
import type { AdminProductInput } from "../../lib/types";
import ActivityList from "../../components/admin/ActivityList";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import ProductForm from "../../components/admin/ProductForm";
import Badge from "../../components/ui/Badge";
import Button, { buttonClasses } from "../../components/ui/Button";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import Panel from "../../components/ui/Panel";

// One page for both /admin/products/new (no :id) and /admin/products/:id.
export default function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();

  const detail = useAdminProduct(id);
  const categories = useCategories();
  const activity = useAdminActivity({ entityType: "product", entityId: id, limit: 10 }, !isNew);
  const { create, update, archive, restore, remove } = useAdminProductMutations();

  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Navigating from /new to the created product reuses this component instance, so a
  // useState initialiser would never see the new location state. Watch the location instead.
  useEffect(() => {
    if ((location.state as { created?: boolean } | null)?.created) setNotice("Product created. It's live in the store.");
  }, [location.key, location.state]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  if ((!isNew && detail.isLoading) || categories.isLoading) return <PageLoader label="Loading product" />;
  if (!isNew && (detail.isError || !detail.data)) {
    return (
      <ErrorState
        message="Product not found."
        detail="It may have been deleted."
        onRetry={() => detail.refetch()}
      />
    );
  }

  const product = detail.data?.product;
  const deleteBlockedReason = detail.data?.deleteBlockedReason ?? null;
  const archived = !!product?.archivedAt;

  async function save(input: AdminProductInput) {
    setError(null);
    setConflict(false);
    try {
      if (isNew) {
        const { product: created } = await create.mutateAsync(input);
        navigate(`/admin/products/${created._id}`, { replace: true, state: { created: true } });
      } else if (product) {
        await update.mutateAsync({ id: product._id, ...input, expectedUpdatedAt: product.updatedAt });
        setNotice("Changes saved.");
      }
    } catch (err) {
      setConflict((err as Error & { code?: string }).code === "CONFLICT");
      setError(err instanceof Error ? err.message : "Couldn't save the product.");
    }
  }

  async function toggleArchive() {
    if (!product) return;
    setError(null);
    try {
      await (archived ? restore : archive).mutateAsync(product._id);
      setNotice(archived ? "Product restored. It's back in the store." : "Product archived. Shoppers can no longer see it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the product.");
    }
  }

  async function confirmRemoval() {
    if (!product) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(product._id);
      navigate("/admin/products", { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete the product.");
    }
  }

  const aside = product ? (
    <>
      <Panel className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Status</h2>
          {archived ? <Badge tone="neutral">Archived</Badge> : <Badge tone="positive">Active</Badge>}
        </div>
        <p className="text-sm text-slate">
          {archived
            ? "Hidden from shoppers. It stays in past orders and can be restored any time."
            : "Visible in the store. Archiving hides it from search and the home page without deleting anything."}
        </p>
        <Button variant="secondary" className="w-full" onClick={toggleArchive} loading={archive.isPending || restore.isPending}>
          {archived ? <ArchiveRestore size={16} aria-hidden /> : <Archive size={16} aria-hidden />}
          {archived ? "Restore product" : "Archive product"}
        </Button>
        <Link to={`/product/${product._id}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 text-sm font-medium text-harbor hover:underline">
          View in store <ExternalLink size={14} aria-hidden />
        </Link>
        <Link to={`/admin/reviews?productId=${product._id}`} className="flex items-center justify-center text-sm font-medium text-harbor hover:underline">
          Manage reviews ({product.ratingCount})
        </Link>
      </Panel>

      <Panel className="space-y-2 p-4">
        <h2 className="text-lg font-semibold text-ink">Delete</h2>
        <Button variant="danger" className="w-full" disabled={!!deleteBlockedReason} onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} aria-hidden /> Delete product
        </Button>
        <p className="text-sm text-slate">{deleteBlockedReason ?? "Permanent. Only possible because nobody has ordered it."}</p>
      </Panel>

      <Panel className="overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 text-lg font-semibold text-ink">History</h2>
        <ActivityList entries={activity.data?.items} isLoading={activity.isLoading} isError={activity.isError} onRetry={() => activity.refetch()} />
      </Panel>
    </>
  ) : undefined;

  return (
    <div>
      <Link to="/admin/products" className="inline-flex items-center gap-1 text-sm font-medium text-harbor hover:underline">
        <ChevronLeft size={16} aria-hidden /> Products
      </Link>
      <h1 className="page-title mt-2 text-ink">{isNew ? "New product" : product?.title}</h1>

      {notice && (
        <p role="status" className="mt-4 rounded-xl border border-moss/20 bg-moss/10 px-4 py-2.5 text-sm font-medium text-moss">
          {notice}
        </p>
      )}
      {archived && !notice && (
        <p className="mt-4 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-slate">
          This product is archived, so shoppers can't see or buy it.
        </p>
      )}
      {conflict && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-tint-butter px-4 py-3 text-sm text-ink">
          <span>Someone else saved this product first. Load their version, then re-apply your changes.</span>
          <button
            type="button"
            className={buttonClasses("secondary", "sm")}
            onClick={async () => {
              setConflict(false);
              setError(null);
              await detail.refetch();
            }}
          >
            Load latest version
          </button>
        </div>
      )}

      <div className="mt-6">
        <ProductForm
          // A new key after every save or reload re-seeds the form from the server's copy.
          key={product?.updatedAt ?? "new"}
          product={product}
          departments={categories.data?.items ?? []}
          busy={create.isPending || update.isPending}
          error={conflict ? null : error}
          submitLabel={isNew ? "Create product" : "Save changes"}
          onSubmit={save}
          aside={aside}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this product?"
        confirmLabel="Delete product"
        busy={remove.isPending}
        error={deleteError}
        onConfirm={confirmRemoval}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
      >
        “{product?.title}” will be removed for good, along with its reviews and any place it appears in carts and lists. This can't be undone.
      </ConfirmDialog>
    </div>
  );
}
