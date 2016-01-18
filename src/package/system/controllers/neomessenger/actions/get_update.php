<?php

class actionNeomessengerGetUpdate extends cmsAction {

    public function run() {

        $template = cmsTemplate::getInstance();
        $user = cmsUser::getInstance();

        $message_last_id = $this->request->get('message_last_id');

        $contacts = $this->model->getContacts($user->id);

        $messages = $this->model->filterGt('id', $message_last_id)->getMessagesFromAllContacts($user->id);

        $messages_count = $this->messenger->model->getNewMessagesCount($user->id);

        $this->messenger->model->resetFilters();

        $noticesCount = $this->messenger->model->getNoticesCount($user->id);

        $template->renderJSON(array(
            'error' => false,
            'contacts' => $contacts ? array_values($contacts) : false,
            'messages' => $messages ? array_values($messages) : false,
            'messagesCount' => $messages_count,
            'noticesCount' => $noticesCount
        ));

    }

}