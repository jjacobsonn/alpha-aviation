import Modal from "react-modal";
import { useState } from "react";

Modal.setAppElement("#root");

export default function AddWorkOrderForm({ isOpen, onClose }) {
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
            contentLabel="Add Work Order"
            style={{ content: { maxWidth: "720px", margin: "auto", padding: "1.5rem" } }}
        >
            <h2>Add Work Order</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Order Number</label>
                    <input name="order_number" value={formData.order_number} onChange={handleChange} />
                    {errors.order_number && <div style={{ color: "red" }}>{errors.order_number}</div>}
                </div>

                <div>
                    <label>Part Number</label>
                    <input name="part_number" value={formData.part_number} onChange={handleChange} />
                    {errors.part_number && <div style={{ color: "red" }}>{errors.part_number}</div>}
                </div>

                <div>
                    <label>Assigned To</label>
                    <input name="assigned_to" value={formData.assigned_to} onChange={handleChange} />
                    {errors.assigned_to && <div style={{ color: "red" }}>{errors.assigned_to}</div>}
                </div>

                <div>
                    <label>Due Date</label>
                    <input name="due_date" type="date" value={formData.due_date} onChange={handleChange} />
                </div>

                <div>
                    <label>Date Reported</label>
                    <input name="date_reported" type="date" value={formData.date_reported} onChange={handleChange} />
                </div>

                <div>
                    <label>Tach Time</label>
                    <input name="tach_time" value={formData.tach_time} onChange={handleChange} />
                </div>

                <div>
                    <label>Hobbs Time</label>
                    <input name="hobbs_time" value={formData.hobbs_time} onChange={handleChange} />
                </div>

                <div>
                    <label>ATA Code</label>
                    <input name="ATA_code" value={formData.ATA_code} onChange={handleChange} />
                </div>

                <div>
                    <label>Component Affected</label>
                    <input name="component_affected" value={formData.component_affected} onChange={handleChange} />
                </div>

                <div>
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4} />
                    {errors.description && <div style={{ color: "red" }}>{errors.description}</div>}
                </div>

                <div>
                    <label>Attachment (file)</label>
                    <input name="attachment" type="file" onChange={handleFileChange} />
                </div>

                <div>
                    <label>Digital Signature</label>
                    <input name="digital_signature" value={formData.digital_signature} onChange={handleChange} placeholder="Signer name or signature data" />
                </div>

                <div style={{ marginTop: "1rem" }}>
                    <button type="submit">Submit</button>
                    <button type="button" onClick={() => { setFormData(initialForm); onClose(); }} style={{ marginLeft: "0.5rem" }}>Cancel</button>
                </div>
            </form>
        </Modal>
    );
}