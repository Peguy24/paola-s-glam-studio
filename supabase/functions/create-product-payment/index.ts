import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { items } = await req.json();
    if (!items || !items.length) throw new Error("No items provided");

    // Get user if authenticated
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        userEmail = data.user.email || null;
      }
    }

    // Fetch product details
    const productIds = items.map((i: any) => i.product_id);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("is_active", true);

    if (prodErr) throw prodErr;
    if (!products || products.length === 0) throw new Error("No valid products found");

    // Build line items and calculate total
    const lineItems: any[] = [];
    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = products.find((p: any) => p.id === item.product_id);
      if (!product) continue;

      let price = product.price;
      if (item.variant_id) {
        const { data: variant } = await supabaseAdmin
          .from("product_variants")
          .select("*")
          .eq("id", item.variant_id)
          .single();
        if (variant?.price) price = variant.price;
      }

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            ...(product.image_url ? { images: [product.image_url] } : {}),
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      });

      totalAmount += price * item.quantity;
      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        unit_price: price,
      });
    }

    // Create order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        client_id: userId,
        client_email: userEmail,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create order items
    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems.map((oi: any) => ({ ...oi, order_id: order.id })));

    if (itemsErr) throw itemsErr;

    // Create Stripe session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.create({
      ...(userEmail ? { customer_email: userEmail } : {}),
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?order_id=${order.id}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
      metadata: { order_id: order.id },
    });

    // Update order with stripe session id
    await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
