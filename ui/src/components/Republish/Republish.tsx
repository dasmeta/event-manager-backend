import { useState, useCallback } from "react";
import { Input, Popover, Button } from "antd";
import { LoadingOutlined, RedoOutlined } from "@ant-design/icons";
import { useSseAction } from "@/hooks/useSseAction";

interface Props {
    subscription: string;
    topic: string;
    path: string;
    refresh: () => {};
    title: string;
    buttonText: string;
    actionTitle: string;
}

const Republish: React.FC<Props> = ({ subscription, topic, path, refresh, title, buttonText, actionTitle }) => {
    const [value, setValue] = useState(null);
    const { run, processing } = useSseAction();
    const handleRepublish = useCallback(() => {
        const data: Record<string, any> = {
            topic,
            subscription
        };
        if(value) {
            data.limit = value;
        }
        run(path, data, { title: actionTitle })
        .then(() => {
            refresh();
        })
        .catch(() => {});
    }, [topic, subscription, value, path, actionTitle, run, refresh]);

    return (
        <Popover
            title={title}
            placement="top"
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
            <Button size="small">
                {processing ? <LoadingOutlined /> : <RedoOutlined />}
                {" "}
                {buttonText}
            </Button>
        </Popover>
    );
};

export default Republish;
