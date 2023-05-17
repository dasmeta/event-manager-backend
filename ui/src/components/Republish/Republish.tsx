import { useState, useCallback } from "react";
import { Input, Popover, Button, message } from "antd";
import { LoadingOutlined, RedoOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";

interface Props {
    subscription: string;
    topic: string;
    republish: (data: any) => {};
    refresh: () => {};
    title: string;
    buttonText: string;
}

const Republish: React.FC<Props> = ({ subscription, topic, republish, refresh, title, buttonText }) => {
    const [value, setValue] = useState(null);
    const [processing, setProcessing] = useState(false);
    // const [visible, setVisible] = useState(false);
    const handleRepublish = useCallback(() => {
        setProcessing(true);
        // setVisible(false);
        const data = {
            topic,
            subscription
        };
        if(value) {
            data.limit = value;
        }
        republish(data)
        .then(() => {
            setProcessing(false);
            refresh();
        })
        .catch(() => {
            message.error(translations.somethingWentWrong);
        });
    }, [topic, subscription, value, republish]);

    return (
        <Popover
            title={title}
            placement="top"
            // open={visible}
            content={
                <div>
                    <Input
                        type="number"
                        placeholder="Limit"
                        defaultValue={value}
                        onChange={e => setValue(e.target.value)}
                    />

                    <br />
                    <br />

                    <Button size="small" type="primary" onClick={handleRepublish}>
                        Process
                    </Button>
                </div>
            }
        >
            <Button size="small" onClick={() => setVisible(!visible)}>
                {processing ? <LoadingOutlined /> : <RedoOutlined />}
                {" "}
                {buttonText}
            </Button>
        </Popover>
    );
};

export default Republish;
