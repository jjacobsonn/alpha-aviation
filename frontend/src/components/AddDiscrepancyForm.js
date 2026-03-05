import Modal from "react-modal";
import { useState } from "react";

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
            style={{ content: { maxWidth: "720px", margin: "auto", padding: "1.5rem" } }}
        >
            <h2>Add Discrepancy</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="order_number">Discrepancy Number</label>
                    <input id="order_number" name="order_number" value={formData.order_number} onChange={handleChange} />
                    {errors.order_number && <div style={{ color: "red" }}>{errors.order_number.replace('Order', 'Discrepancy')}</div>}
                </div>

                <div>
                    <label htmlFor="part_number">Part Number</label>
                    <input id="part_number" name="part_number" value={formData.part_number} onChange={handleChange} />
                    {errors.part_number && <div style={{ color: "red" }}>{errors.part_number}</div>}
                </div>

                <div>
                    <label htmlFor="assigned_to">Assigned To</label>
                    <input id="assigned_to" name="assigned_to" value={formData.assigned_to} onChange={handleChange} />
                    {errors.assigned_to && <div style={{ color: "red" }}>{errors.assigned_to}</div>}
                </div>

                <div>
                    <label htmlFor="due_date">Due Date</label>
                    <input id="due_date" name="due_date" type="date" value={formData.due_date} onChange={handleChange} />
                </div>

                <div>
                    <label htmlFor="date_reported">Date Reported</label>
                    <input id="date_reported" name="date_reported" type="date" value={formData.date_reported} onChange={handleChange} />
                </div>

                <div>
                    <label htmlFor="tach_time">Tach Time</label>
                    <input id="tach_time" name="tach_time" value={formData.tach_time} onChange={handleChange} />
                </div>

                <div>
                    <label htmlFor="hobbs_time">Hobbs Time</label>
                    <input id="hobbs_time" name="hobbs_time" value={formData.hobbs_time} onChange={handleChange} />
                </div>

                <div>
                    <label htmlFor="ATA_code">ATA Code</label>
                    <input id="ATA_code" name="ATA_code" value={formData.ATA_code} onChange={handleChange} />
                </div>

                <div>
                    <label htmlFor="component_affected">Component Affected</label>
                    <input id="component_affected" name="component_affected" value={formData.component_affected} onChange={handleChange} />
                </div>

                <div>
                    <label htmlFor="description">Description</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={4} />
                    {errors.description && <div style={{ color: "red" }}>{errors.description}</div>}
                </div>

                <div>
                    <label htmlFor="attachment">Attachment (file)</label>
                    <input id="attachment" name="attachment" type="file" onChange={handleFileChange} />
                </div>

                <div>
                    <label htmlFor="digital_signature">Digital Signature</label>
                    <input
                        id="digital_signature"
                        name="digital_signature"
                        value={formData.digital_signature}
                        onChange={handleChange}
                        placeholder="Signer name or signature data"
                    />
                </div>

                <div style={{ marginTop: "1rem" }}>
                    <button type="submit">Submit</button>
                    <button type="button" onClick={() => { setFormData(initialForm); onClose(); }} style={{ marginLeft: "0.5rem" }}>Cancel</button>
                </div>
            </form>
        </Modal>
    );
}