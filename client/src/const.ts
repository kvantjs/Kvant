export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = () => {
  localStorage.setItem("kvant-local-session", "active");
  window.location.reload();
};
