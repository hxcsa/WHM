import { redirect } from "next/navigation";

export default function InboundRedirectPage() {
    redirect("/products/stock");
}
