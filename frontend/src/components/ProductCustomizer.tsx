import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Minus, Plus, Ruler, ShoppingCart } from "lucide-react";
import { money } from "../lib/money";
import { hasSizing, optionList, unitPrice } from "../lib/product";
import { useShopStore } from "../store/useShopStore";
import type { Product } from "../types";

function DarkSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-xl text-sm font-medium bg-[#1a1a24] border border-white/10 text-white outline-none focus:border-indigo-500/60 transition-colors cursor-pointer appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
      >
        {options.map((o) => <option key={o} value={o} style={{ background: "#1a1a24", color: "#e2e2ea" }}>{o}</option>)}
      </select>
    </div>
  );
}

export default function ProductCustomizer({ product }: { product: Product }) {
  const { addToCart, showToast } = useShopStore();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [customWidthMm, setCustomWidthMm] = useState<number | undefined>(product.defaultWidthMm ?? undefined);
  const [customHeightMm, setCustomHeightMm] = useState<number | undefined>(product.defaultHeightMm ?? undefined);
  const [customText, setCustomText] = useState("");
  const [material, setMaterial] = useState("");
  const [inkColor, setInkColor] = useState("");
  const [layout, setLayout] = useState("");
  const [finish, setFinish] = useState("");
  const [boardType, setBoardType] = useState("");
  const [lightMode, setLightMode] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setVariantId(product.variants[0]?.id ?? "");
    setQuantity(1);
    setCustomWidthMm(product.defaultWidthMm ?? undefined);
    setCustomHeightMm(product.defaultHeightMm ?? undefined);
    setCustomText("");
    setMaterial(optionList(product, "materials")[0] ?? "");
    setInkColor(optionList(product, "inkColors")[0] ?? "");
    setLayout(optionList(product, "layouts")[0] ?? "");
    setFinish(optionList(product, "finishes")[0] ?? "");
    setBoardType(optionList(product, "boardTypes")[0] ?? "");
    setLightMode(optionList(product, "lightModes")[0] ?? "");
  }, [product]);

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === variantId),
    [product.variants, variantId]
  );

  const livePrice = unitPrice(product, selectedVariant, customWidthMm, customHeightMm);

  function handleAdd() {
    addToCart({
      product,
      variant: selectedVariant,
      quantity,
      customWidthMm: hasSizing(product) ? customWidthMm : undefined,
      customHeightMm: hasSizing(product) ? customHeightMm : undefined,
      customText: customText || undefined,
      customization: {
        material: material || undefined,
        inkColor: inkColor || undefined,
        layout: layout || undefined,
        finish: finish || undefined,
        boardType: boardType || undefined,
        lightMode: lightMode || undefined
      }
    });
    setAdded(true);
    showToast({ type: "success", title: "Added to cart!", message: product.name });
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="bg-[#16161e] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/90 to-violet-600/90 px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">Customize & Order</h2>
          <span className="text-indigo-200 text-xs font-medium">Live pricing</span>
        </div>
        <p className="text-3xl font-bold text-white mt-1">{money(livePrice)}</p>
        <p className="text-indigo-200 text-xs mt-0.5">for qty: {quantity}</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Variant type */}
        {product.variants.length > 0 && (
          <DarkSelect
            label="Product Type"
            value={variantId}
            options={product.variants.map((v) => v.name + (v.priceDelta ? ` (+${money(v.priceDelta)})` : ""))}
            onChange={(val) => {
              const variant = product.variants.find((v) =>
                (v.name + (v.priceDelta ? ` (+${money(v.priceDelta)})` : "")) === val
              );
              if (variant) setVariantId(variant.id);
            }}
          />
        )}

        {/* Sizing inputs */}
        {hasSizing(product) && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                <span className="flex items-center gap-1"><Ruler size={11} /> Width (mm)</span>
              </label>
              <input type="number"
                min={product.minWidthMm ?? 1} max={product.maxWidthMm ?? 9999}
                value={customWidthMm ?? ""}
                onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl text-sm bg-[#1a1a24] border border-white/10 text-white outline-none focus:border-indigo-500/60 transition-colors"
              />
              {product.minWidthMm && product.maxWidthMm && (
                <p className="text-[10px] text-gray-600 mt-1">{product.minWidthMm}–{product.maxWidthMm} mm</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                <span className="flex items-center gap-1"><Ruler size={11} /> Height (mm)</span>
              </label>
              <input type="number"
                min={product.minHeightMm ?? 1} max={product.maxHeightMm ?? 9999}
                value={customHeightMm ?? ""}
                onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl text-sm bg-[#1a1a24] border border-white/10 text-white outline-none focus:border-indigo-500/60 transition-colors"
              />
              {product.minHeightMm && product.maxHeightMm && (
                <p className="text-[10px] text-gray-600 mt-1">{product.minHeightMm}–{product.maxHeightMm} mm</p>
              )}
            </div>
          </div>
        )}

        {/* Custom text */}
        {product.kind !== "STATIONERY" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Custom text / artwork notes</label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Name, designation, address, board text, logo placement, color notes…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-[#1a1a24] border border-white/10 text-white placeholder-gray-600 outline-none focus:border-indigo-500/60 transition-colors resize-none leading-relaxed"
            />
          </div>
        )}

        {/* Option selects */}
        <div className="space-y-3">
          <DarkSelect label="Material" value={material} options={optionList(product, "materials")} onChange={setMaterial} />
          <DarkSelect label="Ink Color" value={inkColor} options={optionList(product, "inkColors")} onChange={setInkColor} />
          <DarkSelect label="Layout" value={layout} options={optionList(product, "layouts")} onChange={setLayout} />
          <DarkSelect label="Board Type" value={boardType} options={optionList(product, "boardTypes")} onChange={setBoardType} />
          <DarkSelect label="Finish" value={finish} options={optionList(product, "finishes")} onChange={setFinish} />
          <DarkSelect label="Lighting" value={lightMode} options={optionList(product, "lightModes")} onChange={setLightMode} />
        </div>

        {/* Quantity + Add to Cart */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Quantity</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0 bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
                  <Minus size={14} />
                </button>
                <input type="number" min={1} max={50} value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="w-12 h-10 text-center text-sm font-bold text-white bg-transparent border-0 outline-none" />
                <button onClick={() => setQuantity(Math.min(50, quantity + 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-sm text-gray-500">max 50 units</span>
            </div>
          </div>

          <button onClick={handleAdd}
            className={`w-full flex items-center justify-center gap-2.5 h-12 rounded-xl font-bold text-sm transition-all shadow-lg ${
              added ? "bg-emerald-600 shadow-emerald-500/20 text-white"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/25 hover:shadow-indigo-500/40 text-white"
            }`}>
            {added
              ? <><CheckCircle size={16} /> Added to Cart!</>
              : <><ShoppingCart size={16} /> Add {money(livePrice * quantity)} to Cart</>
            }
          </button>
        </div>

        {/* Trust info */}
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          <p className="text-[11px] text-gray-600 flex items-center gap-1.5">🔒 100% prepaid · Secure checkout via Razorpay</p>
          <p className="text-[11px] text-gray-600 flex items-center gap-1.5">✉️ Digital proof sent before production</p>
          <p className="text-[11px] text-gray-600 flex items-center gap-1.5">📦 Dispatched in {product.dispatchDays} days after approval</p>
        </div>
      </div>
    </div>
  );
}
