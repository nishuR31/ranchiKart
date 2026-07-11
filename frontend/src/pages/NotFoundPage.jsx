import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="empty-block">
      <h1>404</h1>
      <p>This page doesn't exist.</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}
