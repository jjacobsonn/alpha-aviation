import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

export default function DeleteConfirmationDialog({
  open,
  itemType,
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete this {itemType}? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={isLoading}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
