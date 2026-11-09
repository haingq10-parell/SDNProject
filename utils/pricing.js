// Đơn giá hiện hành theo số lượng mua: giá khuyến mãi + giá sỉ theo bậc (priceTiers)
function getUnitPrice(product, qty = 1) {
  let price =
    product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;

  const tiers = [...(product.priceTiers || [])].sort((a, b) => b.minQty - a.minQty);
  const tier = tiers.find((t) => qty >= t.minQty);
  if (tier && tier.price < price) price = tier.price;

  return price;
}

module.exports = { getUnitPrice };
