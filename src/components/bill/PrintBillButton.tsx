'use client';

import React, { useState } from 'react';
import { Button, type ButtonProps } from '@mui/material';
import { Print } from '@mui/icons-material';
import PrintBillPortal from './PrintBillPortal';
import type { Order } from '@/types';

interface Props extends Omit<ButtonProps, 'onClick'> {
  order: Order;
  invoiceNo?: string;
  label?: string;
}

/**
 * Prints (or saves as PDF) the same 80mm bill the counter prints.
 *
 * The bill is mounted only for the duration of the print so the page isn't
 * carrying a hidden copy of every order in the list. `onafterprint` is what
 * unmounts it — and there's a timeout fallback because Safari doesn't
 * always fire that event.
 */
export default function PrintBillButton({ order, invoiceNo, label = 'Print bill', ...buttonProps }: Props) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);

    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      setPrinting(false);
    };
    window.addEventListener('afterprint', cleanup);

    // The portal needs a paint before the print dialog reads the document.
    requestAnimationFrame(() => {
      window.print();
      setTimeout(cleanup, 3000);
    });
  };

  return (
    <>
      {printing && <PrintBillPortal order={order} invoiceNo={invoiceNo} copyLabel="CUSTOMER COPY" />}
      <Button startIcon={<Print />} onClick={handlePrint} {...buttonProps}>
        {label}
      </Button>
    </>
  );
}
