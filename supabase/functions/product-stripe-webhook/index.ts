import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;
    const webhookSecret = Deno.env.get("STRIPE_PRODUCT_WEBHOOK_SECRET");

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      if (orderId) {
        // Update order status
        await supabaseAdmin
          .from("orders")
          .update({
            status: "paid",
            payment_status: "paid",
          })
          .eq("id", orderId);

        // Decrement stock
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", orderId);

        if (orderItems) {
          for (const item of orderItems) {
            if (item.variant_id) {
              // Decrement variant stock
              const { data: variant } = await supabaseAdmin
                .from("product_variants")
                .select("stock_quantity")
                .eq("id", item.variant_id)
                .single();
              if (variant) {
                await supabaseAdmin
                  .from("product_variants")
                  .update({ stock_quantity: Math.max(0, variant.stock_quantity - item.quantity) })
                  .eq("id", item.variant_id);
              }
            }

            // Decrement product stock
            const { data: product } = await supabaseAdmin
              .from("products")
              .select("stock_quantity")
              .eq("id", item.product_id)
              .single();
            if (product) {
              await supabaseAdmin
                .from("products")
                .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
                .eq("id", item.product_id);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
