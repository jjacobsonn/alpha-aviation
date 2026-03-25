import Modal from "react-modal";
import { useState } from "react";
import {
	Box,
	Stack,
	TextField,
	Button,
	Typography,
	Alert,
} from "@mui/material";

Modal.setAppElement("#root");

export default function AddDiscrepancyForm({ isOpen, onClose }) {
    const initialForm = {
        order_number: "",
        part_number: "",
        assigned_to: "",
        due_date: "",
        date_reported: "",
        tach_time: "",
        hobbs_time: "",
        ATA_code: "",
        component_affected: "",
        description: "",
        attachment: null,
        digital_signature: ""
    };

    const [formData, setFormData] = useState(initialForm);
    const [errors, setErrors] = useState({});

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData((s) => ({ ...s, [name]: value }));
    }

    function handleFileChange(e) {
        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        setFormData((s) => ({ ...s, attachment: file }));
    }

    function validate(data) {
        const errs = {};
        if (!data.order_number) errs.order_number = "Order number is required";
        if (!data.part_number) errs.part_number = "Part number is required";
        if (!data.assigned_to) errs.assigned_to = "Assigned-to is required";
        if (!data.description) errs.description = "Description is required";
        return errs;
    }

    function handleSubmit(e) {
        e.preventDefault();
        const validation = validate(formData);
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;

        // Prepare payload. For now just log; later hook to API.
        if (formData.attachment) {
            const fd = new FormData();
            Object.keys(formData).forEach((k) => {
                if (k === "attachment") {
                    fd.append("attachment", formData.attachment);
                } else {
                    fd.append(k, formData[k] || "");
                }
            });
            console.log("Submitting FormData:", fd);
        } else {
            console.log("Submitting JSON:", { ...formData, attachment: null });
        }

        // Reset form and close modal
        setFormData(initialForm);
        onClose();
    }

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Add Discrepancy"
			style={{
				content: {
					maxWidth: "720px",
					margin: "auto",
					padding: "24px",
					borderRadius: 14,
					border: "1px solid #e0e0e0",
					background: "#fff",
				},
				overlay: {
					backgroundColor: "rgba(0,0,0,0.45)",
					zIndex: 1300,
				},
			}}
        >
			<Box>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
					<Typography variant="h6" sx={{ fontWeight: 900 }}>
						Add Discrepancy
					</Typography>
					<Button variant="text" onClick={() => onClose()}>
						Close
					</Button>
				</Stack>

				{errorMessageFor(errors) ? (
					<Alert severity="error" sx={{ mb: 2 }}>
						{errorMessageFor(errors)}
					</Alert>
				) : null}

				<form onSubmit={handleSubmit}>
					<Stack spacing={2}>
						<TextField
							label="Discrepancy Number"
							name="order_number"
							value={formData.order_number}
							onChange={handleChange}
							error={Boolean(errors.order_number)}
							helperText={errors.order_number ? String(errors.order_number).replace('Order', 'Discrepancy') : ''}
							fullWidth
						/>

						<TextField
							label="Part Number"
							name="part_number"
							value={formData.part_number}
							onChange={handleChange}
							error={Boolean(errors.part_number)}
							helperText={errors.part_number || ''}
							fullWidth
						/>

						<TextField
							label="Assigned To"
							name="assigned_to"
							value={formData.assigned_to}
							onChange={handleChange}
							error={Boolean(errors.assigned_to)}
							helperText={errors.assigned_to || ''}
							fullWidth
						/>

						<Stack direction="row" spacing={2}>
							<TextField
								label="Due Date"
								name="due_date"
								type="date"
								value={formData.due_date}
								onChange={handleChange}
								InputLabelProps={{ shrink: true }}
								fullWidth
							/>
							<TextField
								label="Date Reported"
								name="date_reported"
								type="date"
								value={formData.date_reported}
								onChange={handleChange}
								InputLabelProps={{ shrink: true }}
								fullWidth
							/>
						</Stack>

						<Stack direction="row" spacing={2}>
							<TextField
								label="Tach Time"
								name="tach_time"
								value={formData.tach_time}
								onChange={handleChange}
								fullWidth
							/>
							<TextField
								label="Hobbs Time"
								name="hobbs_time"
								value={formData.hobbs_time}
								onChange={handleChange}
								fullWidth
							/>
						</Stack>

						<Stack direction="row" spacing={2}>
							<TextField
								label="ATA Code"
								name="ATA_code"
								value={formData.ATA_code}
								onChange={handleChange}
								fullWidth
							/>
							<TextField
								label="Component Affected"
								name="component_affected"
								value={formData.component_affected}
								onChange={handleChange}
								fullWidth
							/>
						</Stack>

						<TextField
							label="Description"
							name="description"
							value={formData.description}
							onChange={handleChange}
							error={Boolean(errors.description)}
							helperText={errors.description || ''}
							multiline
							rows={4}
							fullWidth
						/>

						<Stack direction="column" spacing={1}>
							<Typography variant="body2" color="text.secondary">
								Attachment (optional)
							</Typography>
							<Button variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
								Upload file
								<input type="file" hidden name="attachment" onChange={handleFileChange} />
							</Button>
							{formData.attachment ? (
								<Typography variant="caption" color="text.secondary">
									Selected: {formData.attachment.name}
								</Typography>
							) : null}
						</Stack>

						<TextField
							label="Digital Signature"
							name="digital_signature"
							value={formData.digital_signature}
							onChange={handleChange}
							placeholder="Signer name or signature data"
							fullWidth
						/>

						<Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 1 }}>
							<Button
								variant="outlined"
								onClick={() => {
									setFormData(initialForm);
									onClose();
								}}
							>
								Cancel
							</Button>
							<Button type="submit" variant="contained" color="primary">
								Submit
							</Button>
						</Stack>
					</Stack>
				</form>
			</Box>
        </Modal>
    );
}

function errorMessageFor(errors) {
	const first = Object.values(errors || {})[0];
	return first || '';
}