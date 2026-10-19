import { redirect } from "next/navigation";
export default function AgriWallRedirectPage() {
  redirect("/explore?category=competition&subcategory=agri-wall");
}
