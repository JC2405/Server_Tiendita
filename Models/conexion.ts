import { Client } from "../Dependencies/dependecies.ts";

export const Conexion = await new Client().connect({
    hostname: 'localhost',
    username:'root',
    db:'tienda_deno',
    password:"",
})