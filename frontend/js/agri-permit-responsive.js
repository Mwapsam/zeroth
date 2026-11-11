/* ================================================================
   AGRI PERMIT MODAL — Responsive Table Styles
   Transforms the wide table into stacked cards on small screens
   ================================================================ */

.agri-permit-table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 4px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
}

.agri-permit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    min-width: 1200px; /* Force horizontal scroll on small screens */
}

.agri-permit-table th,
.agri-permit-table td {
    border: 1px solid #e2e8f0;
    padding: 6px;
    text-align: left;
    vertical-align: middle;
}

.agri-permit-table th {
    background: #f8fafc;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
}

.agri-permit-table input {
    width: 100%;
    min-width: 80px;
    padding: 6px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.8rem;
}

.agri-permit-photo-cell {
    text-align: center;
    position: relative;
}

.agri-permit-photo-btn {
    background: #f1f5f9;
    border: 1px dashed #94a3b8;
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
    color: #475569;
}

.agri-permit-photo-preview {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    background-size: cover;
    background-position: center;
    z-index: 2;
    display: none; /* hidden by default */
}
.agri-permit-photo-preview.active {
    display: block;
}

/* ================================================================
   RESPONSIVE BREAKPOINT — Tablet & Mobile
   Transform table into stacked card-style rows
   ================================================================ */
@media (max-width: 960px) {
    .agri-permit-table,
    .agri-permit-table thead,
    .agri-permit-table tbody,
    .agri-permit-table th,
    .agri-permit-table td,
    .agri-permit-table tr {
        display: block;
    }

    .agri-permit-table {
        min-width: auto;
        border: none;
    }

    .agri-permit-table thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px;
    }

    .agri-permit-table tr {
        border: 1px solid #cbd5e1;
        margin-bottom: 12px;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .agri-permit-table td {
        border: none;
        border-bottom: 1px solid #f1f5f9;
        position: relative;
        padding-left: 45%;
        text-align: right;
        min-height: 40px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }
    
    .agri-permit-table td:last-child {
        border-bottom: none;
    }

    .agri-permit-table td:before {
        position: absolute;
        top: 50%;
        left: 10px;
        transform: translateY(-50%);
        width: 40%;
        padding-right: 10px;
        white-space: nowrap;
        text-align: left;
        font-weight: 600;
        color: #475569;
        content: attr(data-label);
    }
    
    /* Hide the serial number column on mobile */
    .agri-permit-sn {
        display: none;
    }
    
    .agri-permit-animal-cell,
    .agri-permit-photo-cell {
        display: flex !important;
        flex-direction: column;
        align-items: stretch !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
    }
    
    .agri-permit-animal-cell:before,
    .agri-permit-photo-cell:before {
        position: static;
        text-align: left;
        width: auto;
        transform: none;
        margin-bottom: 4px;
    }

    .livestock-input-wrap {
        width: 100%;
    }

    .livestock-input {
        width: 100% !important;
    }

    .agri-permit-photo-btn {
        width: 100%;
    }

    .agri-permit-code-badge {
        display: inline-block;
        margin: 0 auto;
    }
}

/* ================================================================
   EXTRA SMALL SCREENS (phones)
   ================================================================ */
@media (max-width: 540px) {
    .agri-permit-table td {
        padding-left: 50%;
        font-size: 0.75rem;
    }
    
    .agri-permit-table td:before {
        width: 45%;
        font-size: 0.7rem;
    }
    
    .agri-permit-table input {
        font-size: 0.75rem;
        padding: 5px;
    }
    
    .agri-permit-letterhead {
        flex-direction: column;
        gap: 12px;
    }
    
    .agri-permit-route {
        flex-direction: column;
        gap: 8px;
    }
    
    .agri-permit-route-arrow {
        transform: rotate(90deg);
    }
    
    .agri-permit-rep-row {
        flex-direction: column;
    }
}