import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Divider, Modal, Typography, Input, message } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import ErrorActions from "../ErrorActions";
import translations from "@/assets/translations";
import { eventApi } from "@/services/api";
import { IconCopy } from '@/assets/icons';
import styles from "./EventModal.less";

const { Paragraph } = Typography;

interface Props {
    refresh: () => {};
}

const EventModal: React.FC<Props> = forwardRef<any, Props>(({ refresh }, ref) => {
    const [visible, setVisible] = useState(false);
    const [event, setEvent] = useState({});
    const [eventId, setEventId] = useState("");
    const [topic, setTopic] = useState("");
    const [subscription, setSubscription] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [value, setValue] = useState(null);

    useEffect(() => {
        if (!eventId) {
            return;
        }
        eventApi.eventsIdGet(eventId).then(({ data }) => {
            setEvent(data);
        });
    }, [eventId]);

    useImperativeHandle(ref, () => ({
        open(eventId: string, topic: string, subscription: string) {
            setEventId(eventId);
            setTopic(topic);
            setSubscription(subscription);
            setVisible(true);
        },
    }));

    const close = useCallback(() => {
        setVisible(false);
        setEvent({});
        setEventId("");
        setEditMode(false);
    }, []);

    const activateEditMode = useCallback(() => {
        setEditMode(true);
        setValue(JSON.stringify(event.data || {}, null, 2));
    }, []);

    const deActivateEditMode = useCallback(() => {
        setEditMode(false);
    }, []);

    const handleChange = useCallback((e) => {
        setValue(e.target.value);
    }, []);

    const saveEventData = useCallback(async () => {
        let data = null;
        try {
            data = JSON.parse(value);
        } catch(e) {
            message.error('Wrong JSON format');
            return;
        }
        await eventApi.eventsIdPut(data, eventId);
        setEvent({...event, data});
        setEditMode(false);
    }, []);

    return (
        <Modal open={visible} onCancel={close} onOk={close} title={eventId} width={window.innerWidth * 0.7}>
            <div className={styles.eventModalHeader}>
                <div className={styles.eventModalParagraph}>
                    <Paragraph
                        copyable={{
                            icon: <IconCopy />,
                            text: JSON.stringify(event?.data || {}, null, 2)
                        }}
                    >
                        Copy Event Data
                    </Paragraph>
                    <Paragraph
                        copyable={{
                            icon: <IconCopy />,
                            text: topic
                        }}
                    >
                        topic: {topic}
                    </Paragraph>
                    <Paragraph
                        copyable={{
                            icon: <IconCopy />,
                            text: subscription
                        }}
                    >
                        subscription: {subscription}
                    </Paragraph>
                </div>
                <div className={styles.eventActionTopBtn}>
                    <ErrorActions
                        topic={topic}
                        subscription={subscription}
                        events={[eventId]}
                        refresh={refresh}
                    />
                </div>
            </div>
            <Divider />
            <div>
                <div className={styles.eventActionBtn}>
                    {editMode ? (
                        <>
                            <a className={styles.mt_10} onClick={deActivateEditMode}>
                                <CloseOutlined /> {translations.cancel}
                            </a>
                            <Divider type="vertical" />
                            <a className={styles.mt_10} onClick={saveEventData}>
                                <SaveOutlined /> {translations.save}
                            </a>
                        </>
                    ) : (
                        <a className={styles.mt_10} onClick={activateEditMode}>
                            <EditOutlined /> {translations.edit}
                        </a>
                    )
                    }
                </div>
                {editMode ?
                    <Input.TextArea rows={15} value={value} onChange={handleChange} /> :
                    <pre className={styles.eventDataContent}>{JSON.stringify(event, null, 2)}</pre>
                }
            </div>
        </Modal>
    );
});

export default EventModal;