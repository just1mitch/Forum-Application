$('#answer').on('input', function () {
    $('#answerSubmit').prop('disabled', false);
    if ($(this).val().length > 50) {
        $('#answerError').html("Error: Answer length must be less than 50 characters (currently " + $(this).val().length + ")")
        $('#answerError').parent().show();
        $('#answerSubmit').prop('disabled', true);
    }
    else {
        $('#answerError').parent().hide();
        $('#answerSubmit').prop('disabled', false);
    }
})

function showModal(qid, code, title, difficulty, description, username, date_posted, attempts, completed, points) {
    // setting individually as Safari doesn't support createElement 'options' feature
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
    // Create invisible button to trigger modal
    let btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("id", "modalToggle");
    btn.setAttribute("class", "btn")
    btn.style.display = "none";
    btn.setAttribute("data-bs-toggle", "modal");
    btn.setAttribute("data-bs-target", "#answerModal");

    // render question
    try {
        katex.render(code, document.getElementsByClassName('modal-code')[0], { throwOnError: false });
    } catch (e) {
        console.error("KaTeX render error:", e);
    }

    // Add data to modal
    $('.modal-title').html(title);
    $('.modal-description').html(description);
    $('#byline').html("Posted by " + username + " " + date_posted);
    $('#attempts').html("Attempts Made: " + attempts);
   
    $('#answer').val('');
    $('#submit-answer').attr('qid', qid);
    if (difficulty == 'Easy') {
        $('.modal-difficulty').html("<span class='easy'>Easy</span>");
        $('.modal-difficulty').addClass('ps-4');
        $('.modal-difficulty').removeClass('ps-0');
    }
    else if (difficulty == 'Medium') {
        $('.modal-difficulty').html("<span class='medium'>Medium</span>");
        $('.modal-difficulty').addClass('ps-0');
        $('.modal-difficulty').removeClass('ps-4');
    }
    else if (difficulty == 'Hard') {
        $('.modal-difficulty').html("<span class='hard'>Hard</span>");
        $('.modal-difficulty').addClass('ps-4');
        $('.modal-difficulty').removeClass('ps-0');
    }
    
    if (completed) {
        $('#points').html("Points Earned: " + points);
        answerCorrect(points);
    }
    else $('#points').html("Points Available: " + points);
    renderKaTeX();
    // Click invisible button to trigger Bootstrap Modal
    document.body.appendChild(btn);
    $('#modalToggle').click();
}

function showQuestion(qid, title, difficulty, description, username, date_posted) {
    // Reset Modal
    $('#answer').prop('disabled', false);
    $('#answerSubmit').prop('disabled', false);
    $('#katexErrorCode').prop('hidden', true);
    $('#renderedAnswer').prop('hidden', true);
    $('#correctness').prop('hidden', true);

    getQuestion(qid).then(response => {
        let completed = response.completed;
        let code = response.code;
        let attempts = response.attempts;
        let points = response.points;
        showModal(qid, code, title, difficulty, description, username, date_posted, attempts, completed, points);
    }).catch();
}

$('#submit-answer').submit(function(e) {
    $('#katexErrorCode').prop('hidden', true); // Hide error code again
    e.preventDefault();
    $.ajax({
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        type: "POST",
        url: "/check_answer/" + $(this).attr('qid'),
        data: $(this).serialize(),
        timeout: 30000,
        error: function (jqXHR, _, errorThrown) {
            alert('Error (' + jqXHR.status + '): ' + errorThrown);
            return false;
        },
        success: handleAnswer
    })
})

function handleAnswer(data) {
    // Display rendered code after submitted regardless of correctness
    try {
        $('#renderedAnswer').prop('hidden', false);
        katex.render($('#answer').val(), document.getElementById('renderedAnswer'), { throwOnError: false })
        katex.renderToString($('#answer').val()) // may cause error 
    }
    catch (e) {
        if (e instanceof katex.ParseError) {
            $('#katexErrorCode').html(e.message);
            $('#katexErrorCode').prop('hidden', false);
        }
    }
    // Increment attempts made
    $('#attempts').html("Attempts Made: " + data.attempts);
    // Respond to answer validity
    if (data.completed) answerCorrect(data.points);
    else {
        $('#points').html("Points Available: " + data.points);
        $('#correctness').html('Incorrect!');
        $('#correctness').addClass('incorrect-answer');
        $('#correctness').removeClass('correct-answer');
        $('#correctness').prop('hidden', false);
        $('#answerModal').effect('shake');
    }
}

function answerCorrect(points) {
    // Blank out submit button and text entry after correct
    // Display correct notification to user
    $('#submit-answer').prop('hidden', true);
    $('#points').html("Points Earned: " + points);
    $('#correctness').html('Correct!<br>' + points + ' Points Earned!');
    $('#correctness').addClass('correct-answer');
    $('#correctness').removeClass('incorrect-answer');
    $('#correctness').prop('hidden', false);

    // load comments asynchronously
    getComments($('#submit-answer').attr('qid')).then(comments => {
        $('#commentSection').prop('hidden', false);
        $('#commentSection').html(comments);
        $('.dateposted').each(timeSince);
        renderKaTeX();
    }).catch();
}