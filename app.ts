import { Application, send, oakCors } from "./Dependencies/dependecies.ts";
import { ProductRouter } from "./Routes/productRouter.ts";

const app = new Application();
app.use(oakCors());

// Archivos estáticos (uploads)
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname.startsWith("/uploads")) {
    await send(ctx, ctx.request.url.pathname, {
      root: Deno.cwd(), // Asegúrate que está en el root del proyecto
    });
  } else {
    await next();
  }
});

app.use(ProductRouter.routes());
app.use(ProductRouter.allowedMethods());

console.log("Server corriendo por el puerto 7777");
await app.listen({ port: 7777 });
