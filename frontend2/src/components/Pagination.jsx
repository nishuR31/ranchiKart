import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export default function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 2) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (page >= totalPages - 1) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="pagination">
      <button 
        className="icon-btn" 
        onClick={() => setPage(Math.max(1, page - 1))} 
        disabled={page === 1}
      >
        <ChevronLeft size={16} />
      </button>

      {getPageNumbers().map((n, idx) => (
        n === '...' ? (
          <span key={`dots-${idx}`} className="pagination-dots">
            <MoreHorizontal size={16} />
          </span>
        ) : (
          <button 
            key={n} 
            className={n === page ? "active" : ""} 
            onClick={() => setPage(n)}
          >
            {n}
          </button>
        )
      ))}

      <button 
        className="icon-btn" 
        onClick={() => setPage(Math.min(totalPages, page + 1))} 
        disabled={page === totalPages}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
