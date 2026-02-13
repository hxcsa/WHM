import { redirect } from "next/navigation";

export default function OutboundRedirectPage() {
    redirect("/products/stock");
}
