import { screen, within } from '@testing-library/react';

export function getFieldRoot(labelText) {
  return screen.getByLabelText(labelText).closest('.MuiFormControl-root');
}

export function getFieldError(labelText, message) {
  const fieldRoot = getFieldRoot(labelText);
  if (!fieldRoot) throw new Error(`Could not find field root for ${labelText}`);
  return within(fieldRoot).getByText(message);
}